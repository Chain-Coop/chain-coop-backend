import Project, { ProjectDocument } from "../models/projectModel";

export const createProjectService = async (payload: any): Promise<ProjectDocument> => {
  return await Project.create(payload);
};

export const getUserProjectsService = async (userId: string): Promise<ProjectDocument[]> => {
  return await Project.find({ author: userId }).populate("author", "username email");
};