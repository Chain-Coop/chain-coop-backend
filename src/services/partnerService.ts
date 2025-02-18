import Partner, { IPartner } from "../models/partner"

export const getAllPartners = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return await Partner.find()
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
};

export const getPartnerById = async (id: string) => {
  return await Partner.findById(id);
};

export const createPartner = async (partnerData: Partial<IPartner>) => {
  return await Partner.create(partnerData);
};

export const updatePartner = async (id: string, updateData: Partial<IPartner>) => {
  return await Partner.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

export const deletePartner = async (id: string) => {
  return await Partner.findByIdAndDelete(id);
};
