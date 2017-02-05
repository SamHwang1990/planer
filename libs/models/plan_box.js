/**
 * Created by sam on 16/12/27.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlanSchema = new Schema({
  parent_id: Schema.Types.ObjectId,

  title: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  content: {
    type: String
  },

  nodes: [Schema.Types.ObjectId],

  timestamp: Schema.Types.Mixed,

  owner_id: Schema.Types.ObjectId,
  share_groups: [Schema.Types.Mixed],

  begin_at: Date,
  end_at: Date,
  during: Number,

  repeat_type: {
    type: String,
    lowercase: true,
    enum: ['none', 'date', 'times', 'infinite']
  },
  repeat_interval: {
    type: Number
  },

  locale: Schema.Types.Mixed,

  node_type: {
    type: String,
    lowercase: true,
    enum: ['']
  }
});

module.exports = mongoose.model('PlanBox', PlanSchema);