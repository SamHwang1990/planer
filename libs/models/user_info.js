/**
 * Created by sam on 16/12/27.
 */

"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserInfoSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    match: /^([\w\-_]+(?:\.[\w\-_]+)*)@((?:[a-z0-9]+(?:-[a-zA-Z0-9]+)*)+(?:\.[a-z]{2,6})+)$/i,
    index: {
      unique: true
    }
  },
  nickname: String,
  group_id: [Schema.Types.ObjectId],
  status: {
    type: String,
    lowercase: true,
    'default': 'active',
    enum: ['inactive', 'active', 'destroy']
  },
  remark: {
    type: String,
    trim: true
  }
});

// 暂时默认不返回group_id
UserInfoSchema.options.toObject.transform = function(doc, ret, options) {
  delete ret.id;
  delete ret.group_id;
};

module.exports = mongoose.model('UserInfo', UserInfoSchema);