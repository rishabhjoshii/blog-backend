import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { userSchema } from './verification/user';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { withAccelerate } from '@prisma/extension-accelerate'
import { authmiddlware } from './middleware/authmiddleware';


// const prisma = new PrismaClient();
const prisma = new PrismaClient().$extends(withAccelerate())
const app = new Hono()
const jwtSecretKey = "blog-backend-cloudflare-workers";

app.post('/user/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, email } = body;

    // Validate user input
    const validationResult = await userSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json({ msg: 'Invalid username, password, or email' });
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({ 
      where: { 
        email: email
      },
    });
    if (existingUser) {
      return c.json({ msg: 'Email already in use' });
    }

    // Create new user account
    const newUser = await prisma.user.create({
      data: { username, password, email },
    });

    return c.json({ msg: 'User created successfully' });
  } 
  catch (error) {
    console.error('Error while creating user:', error);
    return c.json({ msg: 'Error while signing up' });
  }

})

// input to this route are email and password
app.post('/user/signin', async (c) => {
  try {
    const body = await c.req.json();
    const {email, password} = body;

    //Authenticate the user. 
    const existingUser = await prisma.user.findUnique({
      where : {
        email : email,
      }
    })

    if(!existingUser){
      return c.json({msg : "User doesn't exits"});
    }
    else if(existingUser.password !== password){
      return c.json({msg : "Incorrect password"})
    }

    //using middleware you can authenticate te user
    //Return a token (JWT) for authorization in subsequent requests if successful,
    const token = await jwt.sign({email},jwtSecretKey);
    return c.json({
      msge : "signIn successfull",
      token : token,
    })
  }
  catch(error){
    console.error('Error while signing in:', error);
    return c.json({
      msg : "Error while signing in",
    });
  }

})

app.get("/posts", async (c)=> {
  // Retrieve all blog posts. 
  try{
    const posts = await prisma.blog.findMany({
      select: {
        title : true,
        description: true,
        id : true,
      },
    });

    if (!posts || posts.length === 0) {
      return c.json({ msg: 'No posts found' });
    }

    // Return the retrieved posts
    return c.json({ msg:"all blog posts retrieved" , blogsArray : posts })
  }
  catch(error){
    console.log("error while fetching all blog posts", error);
    return c.json({msg:"error while fetching all blog posts"});
  }
  
})

// create a new blog post and authenticate user
// Inputs: title, body 
app.post('/posts',authmiddlware, async (c) => {
  // use authmiddlware to authenticate the user first
  try{
    const body = await c.req.json();
    const userid = c.get('id');
    //console.log(body[])
    const postblog = await prisma.blog.create({
      data:{
         authorId : userid,
         title : body['title'],
         description : body['description']
      }
    })
    console.log(postblog); 

    return c.json({msg : "blog posted successfully"});
  }
  catch(error){
    console.log("error while posting new blog", error);
    return c.json({msg:"error while posting new blog"});
  }

});

//Retrieve a single blog post by ID. 
//Actions: Fetch details of a specific blog post. 
//Can be public or have additional details/edit capabilities for the owner.
app.get("/posts/:id", async (c)=> {
  try{
    const blogId = parseInt(c.req.param('id')); 
    console.log("blogId is :-  ",blogId);

    const blog = await prisma.blog.findFirst({
      where : {
        id : blogId
      }
    })

    if(!blog) return c.json({msg : "Post not found , Invalid blog Id"});

    return c.json({
      msg: "blog fetched successfully",
      blog : blog,
    })
  }
  catch(error){
    console.log("error while fetching blog using id",error);
    return c.json({msg : "error occured while fetching blog using id"});
  }
})

//Update a blog post by ID. Inputs: title, Description
//Actions: Update the specified blog post if the authenticated user is the owner. 
//Require authentication.
app.put("/posts/:id",authmiddlware, async (c)=> {
  try{
    const userid = c.get("id");
    const blogId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const {title, description} = body;

    //check if user is the owner/author of the blog
    const owner = await prisma.blog.findFirst({
      where : {
        id : blogId
      }
    })
    if(!owner) return c.json({msg: "blog not found"});

    console.log("author id is " + owner, "  userID is " + userid);
    if(!owner || owner.authorId!==userid) {
      return c.json({msg : "can't update ! , user is not the owner of the blog"});
    }

    const updateBlog = await prisma.blog.update({
      where : {
        id : blogId,
      },
      data : {
        title : title,
        description : description
      }
    })
    return c.json({msg: "blog updated successfully"});

  }
  catch(error){
    console.log("error while updating blog", error);
  }
})


//Delete a blog post by ID. 
//Actions: Delete the specified blog post if the authenticated user is the owner. 
//Require authentication.

app.delete("/posts/:id",authmiddlware, async (c)=> {
  try{
    const userid = c.get("id");
    const blogId = parseInt(c.req.param("id"));

    //retrieve the owner of the blog
    const owner = await prisma.blog.findFirst({
      where : {
        id : blogId
      }
    })
    //check if user is the owner 
    if(!owner) return c.json({msg: "blog not found"});
    if(owner.authorId!==userid) return c.json({msg : "can't delete , user is not the owner of the blog"});

    //else user is the owner delete blog 
    const deleteBlog = await prisma.blog.delete({
      where : {
        id : blogId
      }
    })

    return c.json({msg : "post deleted successfully"});
  }
  catch(error){
    console.log("error while deleting blog",error);
    return c.json({msg : "error while deleting the blog"});
  }
})

export default app

