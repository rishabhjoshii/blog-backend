import zod from 'zod';

export const userSchema = zod.object({
    password : zod.string(),
    email : zod.string().email(),
    username : zod.string(),
})