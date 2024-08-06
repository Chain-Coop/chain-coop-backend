import { Schema, model, Document } from "mongoose";

export interface ProjectDocument extends Document {
  title: string;
  description: string;
  author: string;
}

const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export default model<ProjectDocument>("Project", ProjectSchema);