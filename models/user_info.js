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
    match: /^/
    // todo: need unique
  },
  nickname: String,
  group_id: [Schema.Types.ObjectId],
  remark: {
    type: String,
    trim: true
  }
});

module.exports = mongoose.model('UserInfo', UserInfoSchema);