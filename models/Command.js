import mongoose from "mongoose";

const commandSchema = new mongoose.Schema({
  command: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  response: {
    type: String,
    required: true,
    trim: true,
  },
  channel: {
    // Twitch channel name that owns the command
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  requiresMod: {
    type: Boolean,
    default: false,
  },
});

commandSchema.index({ command: 1, channel: 1 }, { unique: true });

const Command = mongoose.model("Command", commandSchema);
export default Command;
