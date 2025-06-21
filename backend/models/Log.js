import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras' },
  action: { type: String, required: true },
  details: { type: String },
  date: { type: Date, default: Date.now },
});

const Log = mongoose.model('Log', logSchema);
export default Log;
