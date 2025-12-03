import Category from "../models/Category.js";
import Course from "../models/Course.js";

export async function createCategory(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });

  const exists = await Category.findOne({ name });
  if (exists) return res.status(409).json({ message: "Category already exists" });

  const category = await Category.create({ name, description });
  res.status(201).json(category);
}

export async function listCategories(_req, res) {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json({ categories });
}

export async function deleteCategory(req, res) {
  const { id } = req.params;
  const used = await Course.findOne({ categoryId: id });
  if (used) return res.status(400).json({ message: "Category in use by courses" });

  await Category.findByIdAndDelete(id);
  res.json({ message: "Deleted" });
}

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ category: updated });
  } catch (err) {
    console.error("Error in updateCategory:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
