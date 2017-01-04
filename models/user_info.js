/**
 * Created by sam on 16/12/27.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserInfoSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    match: /^([\w\-_]+(?:\.[\w\-_]+)*)@((?:[a-z0-9]+(?:-[a-zA-Z0-9]+)*)+(?:\.[a-z]{2,6})+)$/i
    // todo: need unique
  },
  nickname: String,
  group_id: [Schema.Types.ObjectId],
  status: {
    type: String,
    lowercase: true,
    enum: ['inactive', 'active', 'destroy']
  },
  remark: {
    type: String,
    trim: true
  }
});

module.exports = mongoose.model('UserInfo', UserInfoSchema);