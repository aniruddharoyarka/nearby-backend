const {test}=require("node:test");
const assert=require("node:assert/strict");
const Offer=require("../models/Offer");
const c=require("../controllers/offerController");
const id="507f1f77bcf86cd799439011";
const valid={title:"Offer",category:"Food",location:"Dhaka",date:"2099-01-01",time:"12:00",validUntil:"2099-02-01",description:"Lunch",redemption:"Show this offer at the venue.",originalPrice:1000,discountPercent:25,bannerImage:{url:"https://example.com/banner.jpg",publicId:"offers/banner"}};
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test("offer validation rejects missing banner, invalid prices, dates and discounts",()=>{
 assert.equal(c.validate(valid).discountPercent,25);
 for(const patch of [{bannerImage:{}},{originalPrice:""},{originalPrice:Infinity},{discountPercent:101},{discountPercent:-1},{validUntil:"2098-01-01"},{date:"2099-02-30"},{time:"25:00"},{redemption:""}])assert.throws(()=>c.validate({...valid,...patch}));
 assert.equal(c.serialize({...valid,_id:id}).offerPrice,750);
});
test("new offers cannot forge organizer or approval",async(t)=>{
 t.mock.method(Offer,"create",async(data)=>{assert.equal(data.organizer,"owner");assert.equal(data.status,"Pending");return {...data,_id:id};});
 const res=response();await c.save()({user:{userId:"owner"},body:{...valid,status:"Approved",organizer:"intruder"}},res);assert.equal(res.code,201);
});
test("editing is owner-scoped and always requires reapproval",async(t)=>{
 t.mock.method(Offer,"findOneAndUpdate",async(filter,data)=>{assert.deepEqual(filter,{_id:id,organizer:"owner",status:{$ne:"Rejected"}});assert.equal(data.status,"Pending");return null;});
 const res=response();await c.save(true)({params:{id},user:{userId:"owner"},body:valid},res);assert.equal(res.code,404);
});
test("public lists only approved unexpired offers; mine ignores supplied owner",async(t)=>{
 const filters=[];t.mock.method(Offer,"find",filter=>{filters.push(filter);return {populate:()=>({sort:async()=>[]})};});
 await c.list("public")({},response());assert.equal(filters[0].status,"Approved");assert.ok(filters[0].validUntil.$gte);
 await c.list("mine")({user:{userId:"owner"},query:{organizer:"someone-else"}},response());assert.deepEqual(filters[1],{organizer:"owner"});
});
test("public details apply visibility filters and handle missing offers",async(t)=>{
 t.mock.method(Offer,"findOne",filter=>{assert.equal(filter.status,"Approved");assert.ok(filter.validUntil.$gte);return {populate:async()=>null};});
 const res=response();await c.detail()({params:{id}},res);assert.equal(res.code,404);
});
test("deletion is scoped to authenticated owner",async(t)=>{
 t.mock.method(Offer,"findOneAndDelete",async(filter)=>{assert.deepEqual(filter,{_id:id,organizer:"owner"});return null;});
 const res=response();await c.remove({params:{id},user:{userId:"owner"}},res);assert.equal(res.code,404);
});
test("moderation validates status and persists approved status",async(t)=>{
 let res=response();await c.moderate({params:{id},body:{status:"Active"}},res);assert.equal(res.code,400);
 t.mock.method(Offer,"findOneAndUpdate",(offerId,data)=>{assert.deepEqual(offerId,{_id:id,status:{$ne:"Rejected"}});assert.equal(data.status,"Approved");return {populate:async()=>({...valid,_id:id,status:data.status})};});
 res=response();await c.moderate({params:{id},body:{status:"Approved"}},res);assert.equal(res.body.offer.status,"Approved");
});
