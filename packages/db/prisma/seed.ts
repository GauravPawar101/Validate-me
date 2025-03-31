import { PrismaClient } from "@prisma/client";
import { prismaClient } from "../src/index";

async function seed(){
    const USER_ID = "4";
    await prismaClient.user.create({
        data:{
            id:USER_ID,
            email: "test@test.com",
            password: "test",
        }
    })

    const v = await prismaClient.validator.create({
        data:{
            id:"2",
            publicKey:"0x12432412",
            location:"Delhi",
            ip:"127.0.0.1"
        }
    })
    const site = await prismaClient.website.create({
        data:{
            id:"3",
            url: "https://youtube.com",
            userId:USER_ID,
        }
    })
    
    await prismaClient.websiteTick.create({
        data:{
            websiteId: site.id,
            status: "good",
            createdAt: new Date(Date.now()-1000*60*10),
            latency: 100,
            validatorId: v.id,
        }
    })
    
    await prismaClient.websiteTick.create({
        data:{
            websiteId: site.id,
            status: "bad",
            createdAt: new Date(Date.now()-1000*60*50),
            latency: 100,
            validatorId: v.id,
        }
    })
    
    await prismaClient.websiteTick.create({
        data:{
            websiteId: site.id,
            status: "bad",
            createdAt: new Date(Date.now()-1000*60*40),
            latency: 100,
            validatorId: v.id,
        }
    })
    
    await prismaClient.websiteTick.create({
        data:{
            websiteId: site.id,
            status: "bad",
            createdAt: new Date(Date.now()-1000*60*30),
            latency: 100,
            validatorId: v.id,
        }
    })
    
    await prismaClient.websiteTick.create({
        data:{
            websiteId: site.id,
            status: "good",
            createdAt: new Date(Date.now()-1000*60*20),
            latency: 100,
            validatorId: v.id,
        }
    })
}
