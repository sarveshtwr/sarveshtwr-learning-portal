require("dotenv").config();
const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const {Admin}=require("./models");
(async()=>{
 try{
  if(!process.env.MONGODB_URI||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD){throw new Error("Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.");}
  if(process.env.ADMIN_PASSWORD.length<12)throw new Error("Use an admin password of at least 12 characters.");
  await mongoose.connect(process.env.MONGODB_URI);
  const email=process.env.ADMIN_EMAIL.trim().toLowerCase(),passwordHash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);
  await Admin.findOneAndUpdate({email},{email,passwordHash},{upsert:true,new:true,setDefaultsOnInsert:true});
  console.log(`Admin account ready: ${email}`);
 }catch(e){console.error(e.message);process.exitCode=1}
 finally{await mongoose.disconnect().catch(()=>{})}
})();
