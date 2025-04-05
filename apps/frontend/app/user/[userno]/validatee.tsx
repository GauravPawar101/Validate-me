// components/Validatee.tsx
import { randomUUIDv7 } from "bun";
import type { OutgoingMessage, SignupOutgoingMessage, ValidateOutgoingMessage } from "../../packages/common";
import { Keypair, PublicKey, Connection, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import nacl_util from "tweetnacl-util";
import "dotenv/config";
import bs58 from "bs58";
import { useEffect } from "react";
export default function Validatee(){
    useEffect(()=>{
const MAX_RECONNECT_DELAY = 30000; 
const VALIDATION_TIMEOUT = 10000; 
const WS_SERVER_URL = process.env.WS_SERVER_URL || "ws://localhost:8081";
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const HEARTBEAT_INTERVAL = 30000; 
const CALLBACKS = {};
let validatorId = null;
let connection = null;
let keypair = null;
let wsConnection = null;
let reconnectAttempt = 0;
let isConnected = false;
let lastValidatedUrls = new Map();


async function initialize() {
  try {
    console.log("Initializing DePIN validator...");
    const pvtkeyHex = process.env.PRIVATE_KEY;
    if (!pvtkeyHex) throw new Error("PRIVATE_KEY not found in environment variables!");
    
    const pvtkey = bs58.decode(pvtkeyHex);
    if (pvtkey.length !== 64) throw new Error("Invalid private key length, must be 64 bytes");
    
    keypair = Keypair.fromSecretKey(pvtkey);
    connection = new Connection(SOLANA_RPC_URL, "confirmed");
    
    console.log(`Validator public key: ${keypair.publicKey.toString()}`);
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`Current balance: ${balance / 1000000000} SOL`);
    connectWebSocket();
    
    monitorBalance();
  } catch (error) {
    console.error("Initialization error:", error);
    process.exit(1);
  }
}

function connectWebSocket() {
  console.log(`Connecting to WebSocket server at ${WS_SERVER_URL}...`);
  
  try {
    wsConnection = new WebSocket(WS_SERVER_URL);
    
    wsConnection.onopen = async () => {
      console.log("Connected to hub server");
      isConnected = true;
      reconnectAttempt = 0;
      await signup();
      startHeartbeat();
    };
    
    wsConnection.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Received message type: ${data.type}`);
        
        switch (data.type) {
          case 'signup':
            handleSignupResponse(data.data);
            break;
          case 'validate':
            await validateHandler(data.data);
            break;
          case 'reward':
            handleReward(data.data);
            break;
          case 'ping':
            sendPong();
            break;
          default:
            console.log(`Unknown message type: ${data.type}`);
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    };
    
    wsConnection.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    wsConnection.onclose = () => {
      console.log("Connection closed");
      isConnected = false;
      const delay = Math.min(1000 * (2 ** reconnectAttempt), MAX_RECONNECT_DELAY);
      reconnectAttempt++;
      console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
      setTimeout(connectWebSocket, delay);
    };
  } catch (error) {
    console.error("Error creating WebSocket connection:", error);
    setTimeout(connectWebSocket, 5000);
  }
}



async function signup() {
  try {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, cannot signup");
      return;
    }
    const callbackId = randomUUIDv7();
    CALLBACKS[callbackId] = (data) => {
      validatorId = data.validatorId;
      console.log(`Registered as validator with ID: ${validatorId}`);
    };
    const message = `Signed message for ${callbackId}, ${keypair.publicKey}`;
    const signedMessage = await signMessage(message, keypair);
    wsConnection.send(JSON.stringify({
      type: 'signup',
      data: {
        callbackId,
        ip: process.env.VALIDATOR_IP || '127.0.0.1',
        publicKey: keypair.publicKey.toString(),
        signedMessage,
        version: '1.0.0',
        capabilities: ['http', 'https', 'dns'],
      },
    }));
    console.log("Signup request sent");
  } catch (error) {
    console.error("Error during signup:", error);
  }
}
function handleSignupResponse(data) {
  const callback = CALLBACKS[data.callbackId];
  if (callback) {
    callback(data);
    delete CALLBACKS[data.callbackId];
  } else {
    console.warn(`No callback found for ID: ${data.callbackId}`);
  }
}



async function validateHandler(data) {
  const { url, callbackId, websiteId } = data;
  console.log(`Validating ${url} (ID: ${websiteId})`);
  const now = Date.now();
  const lastValidated = lastValidatedUrls.get(url);
  if (lastValidated && now - lastValidated < 60000) { // Don't validate more than once per minute
    console.log(`Recently validated ${url}, using cached result`);
  }
  lastValidatedUrls.set(url, now);
  const startTime = Date.now();
  let status = 'bad';
  let latency = 0;
  let details = {};
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(VALIDATION_TIMEOUT).then(() => controller.abort());
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'DePIN-Validator/1.0' }
    });
    
    clearTimeout(timeoutId);
    const endTime = Date.now();
    latency = endTime - startTime;
    if (response.status === 200) {
      status = 'good';
      try {
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        
        details = {
          contentType,
          contentLength: text.length,
          hasValidHtml: contentType?.includes('text/html') && text.includes('<!DOCTYPE html>'),
          tlsVersion: response.headers.get('sec-ch-ua') || 'unknown',
          serverInfo: response.headers.get('server') || 'unknown',
        };
      } catch (err) {
        console.warn("Error during enhanced validation:", err);
      }
    } else {
      details.statusCode = response.status;
      details.statusText = response.statusText;
    }
  } catch (err) {
    console.error(`Error validating ${url}:`, err);
    status = 'bad';
    details.error = err.message;
    details.errorType = err.name;
  }
  
  try {
    const validationMessage = `${callbackId}|${websiteId}|${status}|${latency}`;
    const signedMessage = await signMessage(validationMessage, keypair);
    wsConnection.send(JSON.stringify({
      type: 'validate',
      data: {
        callbackId,
        status,
        latency,
        websiteId,
        validatorId,
        signedMessage,
        details,
        timestamp: Date.now(),
      },
    }));
    
    console.log(`Validation result sent for ${url}: ${status}, latency: ${latency}ms`);
  } catch (error) {
    console.error("Error sending validation result:", error);
  }
}



function handleReward(data) {
  const { amount, txSignature, websiteId } = data;
  console.log(`Received reward of ${amount} tokens for validating website ${websiteId}`);
  console.log(`Transaction signature: ${txSignature}`);
  
  if (txSignature) {
    verifyTransaction(txSignature).catch(err => {
      console.error("Error verifying reward transaction:", err);
    });
  }
}



async function verifyTransaction(signature) {
  try {
    const tx = await connection.getTransaction(signature, { commitment: 'confirmed' });
    if (!tx) {
      console.warn("Transaction not found on-chain");
      return false;
    }
    
    console.log("Transaction verified on-chain");
    return true;
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return false;
  }
}


async function signMessage(message, keypair) {
  const messageBytes = nacl_util.decodeUTF8(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return JSON.stringify(Array.from(signature));
}


async function monitorBalance() {
  let lastBalance = await connection.getBalance(keypair.publicKey);
  
  setInterval(async () => {
    try {
      const currentBalance = await connection.getBalance(keypair.publicKey);
      
      if (currentBalance !== lastBalance) {
        const change = (currentBalance - lastBalance) / 1000000000; // Convert lamports to SOL
        console.log(`Balance changed by ${change > 0 ? '+' : ''}${change} SOL`);
        console.log(`New balance: ${currentBalance / 1000000000} SOL`);
        lastBalance = currentBalance;
      }
    } catch (error) {
      console.error("Error monitoring balance:", error);
    }
  }, 60000); 
}

function startHeartbeat() {
  setInterval(() => {
    if (isConnected) {
      wsConnection.send(JSON.stringify({ type: 'heartbeat', data: { validatorId } }));
    }
  }, HEARTBEAT_INTERVAL);
}


function sendPong() {
  if (isConnected) {
    wsConnection.send(JSON.stringify({ type: 'pong', data: { validatorId, timestamp: Date.now() } }));
  }
}


function setupGracefulShutdown() {
  const shutdown = () => {
    console.log("Shutting down gracefully...");
    
    if (wsConnection && isConnected) {
      wsConnection.send(JSON.stringify({ 
        type: 'shutdown', 
        data: { validatorId, reason: 'graceful_exit' } 
      }));
      
      wsConnection.close();
    }
    
    setTimeout(() => {
      console.log("Shutdown complete");
      process.exit(0);
    }, 1000);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}


async function main() {
  await initialize();
  setupGracefulShutdown();
  console.log("Validator is running");
}

main().catch(error => {
  console.error("Fatal error:", error);
  console.error("Failed to start validator");
  return false;
});},[]);

    return null;
}