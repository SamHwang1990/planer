/**
 * Created by sam on 16/12/27.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserPasswordSchema = new Schema({
  user_email: {
    type: String,
    require: true,
    index: {
      unique: true
    }
  },
  password: {
    type: String,
    require: true
  },
  salt: {
    type: String,
    require: true
  },
  history_password: [Schema.Types.Mixed]
});

module.exports = mongoose.model('UserPassword', UserPasswordSchema);