import Category from "../models/categoryModel";

export const addCategory = async (name: string, createdBy: string) => {
	const newCategory = new Category({ name, createdBy });
	await newCategory.save();
	return newCategory;
};

export const getCategories = async () => {
	return await Category.find().sort({ createdAt: -1 });
};

export const getCategoryById = async (id: string) => {
	return await Category.findById(id);
};

export const updateCategory = async (id: string, name: string) => {
	return await Category.findByIdAndUpdate(
		id,
		{ name },
		{ new: true, runValidators: true }
	);
};

export const deleteCategory = async (id: string) => {
	return await Category.findByIdAndDelete(id);
};
