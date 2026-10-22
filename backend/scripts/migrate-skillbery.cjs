/** Inspect first. No .env loading, deletion of records, or syncIndexes(). */
const mongoose=require('mongoose');
require('../src/models');
const args=new Set(process.argv.slice(2));
if(args.has('--help')){console.log('MIGRATION_URI=<staging replica-set URI> node scripts/migrate-skillbery.cjs [--apply-schema --backup-confirmed] [--retire-legacy-indexes]');process.exit(0);}
if(!process.env.MIGRATION_URI)throw new Error('Set MIGRATION_URI explicitly; .env is never loaded');
const apply=args.has('--apply-schema');
if(apply&&!args.has('--backup-confirmed'))throw new Error('Apply requires --backup-confirmed after a verified restore rehearsal');
async function main(){
 await mongoose.connect(process.env.MIGRATION_URI,{autoIndex:false,autoCreate:false});
 const db=mongoose.connection.db;const names=new Set((await db.listCollections({}, {nameOnly:true}).toArray()).map(c=>c.name));
 const report={mode:apply?'apply':'dry-run',collections:[],classroomBackfills:0,unmappedClassrooms:0,legacyPublicMaterials:0,unmappedInvitations:0};
 for(const model of Object.values(mongoose.models)){
 const name=model.collection.name;const indexes=names.has(name)?await db.collection(name).indexes():[];
 const retiring=indexes.filter(i=>(i.expireAfterSeconds!==undefined&&Object.keys(i.key).length===1&&i.key.deletedAt===1)||(name==='batchjoincodes'&&JSON.stringify(i.key)===JSON.stringify({session:1,classBatch:1,labBatch:1})));
 report.collections.push({name,documents:names.has(name)?await db.collection(name).countDocuments():0,existingIndexes:indexes.map(i=>({name:i.name,key:i.key,unique:i.unique,expireAfterSeconds:i.expireAfterSeconds})),desiredIndexes:model.schema.indexes(),retireAfterReview:retiring.map(i=>i.name)});
 // Retirement is explicit, narrowly matched, and never deletes records.
 if(apply&&args.has('--retire-legacy-indexes'))for(const i of retiring)await db.collection(name).dropIndex(i.name);
 }
 if(names.has('classrooms'))for await(const c of db.collection('classrooms').find({teachingGroupId:null})){
 const offering=c.courseOfferingId&&await db.collection('courseofferings').findOne({_id:c.courseOfferingId});
 const group=offering?.teachingGroupId&&await db.collection('teachinggroups').findOne({_id:offering.teachingGroupId});
 if(!group){report.unmappedClassrooms++;continue;}
 report.classroomBackfills++;
 if(apply)await db.collection('classrooms').updateOne({_id:c._id,teachingGroupId:null},{$set:{teachingGroupId:group._id,...(!c.classBatch?{classBatch:group.name.replace(/^Batch\s+/i,'').toUpperCase()}: {})}});
 }
 if(names.has('materials'))report.legacyPublicMaterials=await db.collection('materials').countDocuments({url:{$regex:'^https?://'},'storage.publicId':{$exists:false},deletedAt:null});
 if(names.has('batchjoincodes'))report.unmappedInvitations=await db.collection('batchjoincodes').countDocuments({teachingGroupId:null,deletedAt:null});
 // Add declared indexes without dropping unrelated ones. Duplicate-key errors
 // deliberately stop migration; resolve duplicates by reviewed data mapping.
 if(apply)for(const model of Object.values(mongoose.models))await model.createIndexes();
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error('Migration stopped:',e.code||e.name);process.exitCode=1;}).finally(()=>mongoose.disconnect());
