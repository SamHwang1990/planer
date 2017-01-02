/**
 * Created by sam on 16/12/27.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupInfoSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
    // todo: need unique
  },
  user_list: [Schema.Types.ObjectId]
});

module.exports = GroupInfoSchema;