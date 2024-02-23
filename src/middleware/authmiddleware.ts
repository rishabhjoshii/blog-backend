import { PrismaClient } from '@prisma/client/edge'
import jwt from '@tsndr/cloudflare-worker-jwt';

const prisma = new PrismaClient()

const jwtSecretKey = "blog-backend-cloudflare-workers";

export const authmiddlware = async function (c:any ,next:any){
    try{
        const authorize = await c.req.header("Authorization");

        if(authorize && authorize.startsWith("Bearer")){
            const token = authorize.split(" ")[1];
            console.log(token);

            const isValid = await jwt.verify(token, jwtSecretKey);

            if(!isValid) return c.json({msg :"invalid token"});

            const {header, payload } = jwt.decode(token);
            const email = payload.email;
            const user = await prisma.user.findFirst({
                where:{
                    email
                },
                select:{
                    id:true
                }
                })
            c.set('id',user?.id);

            await next();
        }
        else{
            return c.json({msg:"Invalid token"});
        }
    }
    catch(error){
        console.log("error occured inside authmiddleware",error);
        return c.json({msg : "error occured inside authmiddleware"});
    }
}