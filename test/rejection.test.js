const {test}=require('node:test');
const assert=require('node:assert/strict');
const Event=require('../models/Event');const Offer=require('../models/Offer');
const events=require('../controllers/eventController');const offers=require('../controllers/offerController');
const id='507f1f77bcf86cd799439011';
const res=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
for(const [label,Model,handler] of [['event',Event,events.updateEventStatus],['offer',Offer,offers.moderate]]) {
 test(label+' rejection requires a reason',async()=>{for(const rejectionReason of [undefined,'   ']){const r=res();await handler({params:{id},body:{status:'Rejected',rejectionReason}},r);assert.equal(r.code,400);}});
 test(label+' rejection stores trimmed reason and excludes already rejected records',async(t)=>{
 t.mock.method(Model,'findOneAndUpdate',(filter,update)=>{assert.equal(filter.status.$ne,'Rejected');assert.equal(update.rejectionReason,'Missing details');return {populate:async()=>null};});
 const r=res();await handler({params:{id},body:{status:'Rejected',rejectionReason:' Missing details '}},r);assert.equal(r.code,404);
 });
}
