import dotenv from 'dotenv';
dotenv.config();

import {
    MainImage, MAIN_SECTIONS,
    SeedCategory, SeedType,
    FertilizerCategory, FertilizerType,
    InsecticideCategory, InsecticideType,
    Place, Engineer,
} from '../models/index.js';
import {
    byId,
    allData, mainImages,
    seedsData, seedCategoryById, seedTypeShape,
    fertilizerList, fertilizerCategoryById, fertilizerTypes, fertilizerNested, fertTypeShape,
    insecticideData, insecticideList, insecticideCategoryById, insecticideTypes, insecticideTypeShape,
    communicationData, communicationList, placeById, engineersOf, engineerShape,
} from '../services/catalog.js';
import uploadImage from '../utils/uploader/upload.js';
import deleteImage from '../utils/uploader/deleteImage.js';
import replaceImage from '../utils/uploader/replaceImage.js';

// Data lives in separate collections (see models/): main_images, seed_*, fertilizer_*, insecticide_*,
// places + engineers. The responses are rebuilt in services/catalog.js with the same shapes as before.

const imageOf = (item) => item?.img?.id;
const dropImages = async (ids) => {
    for (const id of ids) if (id) await deleteImage(id);
};
const toImg = ({ url, public_id }) => ({ url, id: public_id });
// replace the picture of a loaded document (uploads first, removes the old file afterwards)
const swapImage = async (item, file) => {
    item.img = toImg(await replaceImage(imageOf(item), file.buffer));
};

export const getALlData = async (req, res) => {
    try {
        res.status(200).json({ data: await allData() });
    } catch (error) {
        res.status(500).json({ message: 'fitch data error', error: error.message });
    }
};
export const getmainCat = async (req, res) => {
    try {
        res.status(200).json({ data: await mainImages() });
    } catch (error) {
        res.status(500).json({ message: 'fitch data error', error: error.message });
    }
}
export const addmainCat = async (req, res) => {
    try {
        const { section } = req.body;
        if (!MAIN_SECTIONS.includes(section)) {
            return res.status(400).json({ message: `section must be one of: ${MAIN_SECTIONS.join(', ')}` });
        }
        const file = req.file;
        if (!file) {
            return res.status(404).json({ message: 'No file found' });
        }
        const current = await MainImage.findOne({ section });
        const oldId = imageOf(current);
        const uploaded = await uploadImage(file.buffer);
        await MainImage.updateOne({ section }, { $set: { img: toImg(uploaded) } }, { upsert: true });
        if (oldId) await deleteImage(oldId);

        res.status(200).json({ data: await mainImages() });
    } catch (error) {
        res.status(500).json({ message: 'fitch data error', error: error.message });
    }
}
export const UpdatemainCat = async (req, res) => {
    try {
        const { section } = req.body;
        if (!MAIN_SECTIONS.includes(section)) {
            return res.status(400).json({ message: `section must be one of: ${MAIN_SECTIONS.join(', ')}` });
        }
        const file = req.file;
        if (!file) {
            return res.status(404).json({ message: 'No file found' });
        }
        const current = await MainImage.findOne({ section });
        const uploaded = await replaceImage(imageOf(current), file.buffer);
        await MainImage.updateOne({ section }, { $set: { img: toImg(uploaded) } }, { upsert: true });

        res.status(200).json({ data: await mainImages() });
    } catch (error) {
        res.status(500).json({ message: 'fitch data error', error: error.message });
    }
}
//seeds categories
export const getAllSeeds = async (req, res) => {
    try {
        res.status(200).json({ data: await seedsData() });
    } catch (error) {
        res.status(500).json({ message: 'fitch data error', error: error.message });
    }
};
export const addSeedsCategories = async (req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const uploaded = await uploadImage(file.buffer);
        await SeedCategory.create({ name, img: toImg(uploaded) });

        res.status(200).json({
            message: 'new category added successfully',
            categories: (await seedsData()),
        });

    } catch (error) {
        res.status(500).json({ message: 'Add category error', error: error.message });
    }
};
export const deleteCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await byId(SeedCategory, id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // collect every image of the category and its types, then remove the records
        const types = await SeedType.find({ category: category._id });
        const imageIds = [imageOf(category)];
        for (const type of types) {
            imageIds.push(imageOf(type), type.description?.img?.id);
        }
        await dropImages(imageIds);

        await SeedType.deleteMany({ category: category._id });
        await category.deleteOne();

        res.status(200).json({ message: '✅ Category and all nested images deleted successfully', categories: await seedsData() });

    } catch (error) {
        res.status(500).json({ message: '❌ Delete category error', error: error.message });
    }
};

export const updateCategoryById = async (req, res) => {
    try {
        const { id, name } = req.body;
        const file = req.file;

        if (!file && !name) {
            return res.status(400).json({ message: "No data provided for update" });
        }

        const category = await byId(SeedCategory, id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (name) {
            category.name = name;
        }
        if (file) {
            await swapImage(category, file);
        }
        await category.save();

        res.status(200).json({
            message: "Category updated successfully",
            categories: await seedsData(),
        });
    } catch (error) {
        res.status(500).json({ message: "Update error", error: error.message });
    }
};

// seeds main type subCat
export const getSeedsTypeByID = async (req, res) => {
    try {
        const { id } = req.params;

        const seedsType = await seedCategoryById(id);
        if (!seedsType) {
            return res.status(404).json({ message: 'Seed category not found' });
        }

        res.status(200).json({ data: seedsType });

    } catch (error) {
        res.status(500).json({ message: "get seeds type error", error: error.message });
    }
}
export const addSeedsTypeByID = async (req, res) => {
    try {
        const { id, name } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(404).json({ message: 'No file found' });
        }

        const category = await byId(SeedCategory, id);
        if (!category) {
            return res.status(404).json({ message: 'Seed category not found' });
        }
        const uploaded = await uploadImage(file.buffer);
        await SeedType.create({ category: category._id, name, img: toImg(uploaded) });

        res.status(200).json({ data: await seedCategoryById(id), message: "adding subCategory successfully" });

    } catch (error) {
        res.status(500).json({ message: "get seeds type error", error: error.message });
    }
}

export const deleteSeedsTypeByID = async (req, res) => {
    try {
        const { id } = req.params;

        const type = await byId(SeedType, id);
        if (!type) {
            return res.status(404).json({ message: '❌ Subcategory not found' });
        }

        // subcategory image + description image (if exists)
        await dropImages([imageOf(type), type.description?.img?.id]);
        await type.deleteOne();

        res.status(200).json({ message: '✅ Subcategory and nested images deleted successfully' });
    } catch (error) {
        res.status(500).json({
            message: '❌ Delete subcategory error',
            error: error.message,
        });
    }
};

export const updateSeedsTypeByID = async (req, res) => {
    try {
        const { name, id } = req.body;
        const file = req.file;

        const type = await byId(SeedType, id);
        if (!type) {
            return res.status(404).json({ message: '❌ Subcategory not found' });
        }

        if (name) type.name = name;
        if (file) {
            await swapImage(type, file);
        }
        await type.save();

        res.status(200).json({ message: '✅ Subcategory updated successfully' });
    } catch (error) {
        res.status(500).json({
            message: '❌ Update error',
            error: error.message,
        });
    }
};
// seeds  descreption// ✅ Get the full subcategory (Type) including description by its ID
export const getSeedsDescreptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const type = await byId(SeedType, id).then((d) => d?.toObject());
        if (!type) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        res.status(200).json({ data: seedTypeShape(type) }); // includes full description object
    } catch (error) {
        res.status(500).json({ message: 'Fetch error', error: error.message });
    }
};
export const addSubCategoryDescription = async (req, res) => {
    try {
        const { id } = req.params; // Subcategory (SeedType) _id
        const { name, company, description } = req.body;

        const type = await byId(SeedType, id);
        if (!type) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        // Overwrite or add description
        type.description = {
            name: name || '',
            company: company || '',
            description: description || '',
        };
        await type.save();

        res.status(200).json({ message: '✅ Description added successfully' });

    } catch (error) {
        res.status(500).json({ message: '❌ Failed to add description', error: error.message });
    }
};
export const updateSubCategoryDescription = async (req, res) => {
    try {
        const { id } = req.params; // this is the subcategory (SeedType) _id
        const { name, company, description } = req.body;

        const type = await byId(SeedType, id);
        if (!type) return res.status(404).json({ message: 'Subcategory not found' });

        // If description doesn't exist yet, create it
        if (!type.description) {
            type.description = {};
        }
        if (name !== undefined) type.description.name = name;
        if (company !== undefined) type.description.company = company;
        if (description !== undefined) type.description.description = description;
        await type.save();

        res.status(200).json({ message: '✅ Description updated successfully' });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to update description', error: error.message });
    }
};

export const deleteSubCategoryDescriptionById = async (req, res) => {
    try {
        const { id } = req.params; // subcategory (SeedType) to find

        const type = await byId(SeedType, id);
        if (!type) {
            return res.status(404).json({ message: 'Description not found or already deleted' });
        }

        type.description = undefined; // remove the entire object
        await type.save();

        res.status(200).json({ message: '✅ Description deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete description', error: error.message });
    }
};

//Comunication
export const getAllCommunication = async (req, res) => {
    try {
        res.status(200).json({ data: await communicationData() });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to get Communication', error: error.message });
    }
}
//add Communication
export const addCommunication = async (req, res) => {
    try {
        const { name } = req.body;
        await Place.create({ name });
        res.status(200).json({ data: await communicationList() });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to add Communication', error: error.message });
    }
}
//update communication
export const updateCommunication = async (req, res) => {
    try {
        const { id, name } = req.body;
        const place = await byId(Place, id);
        if (!place) {
            return res.status(404).json({ message: '❌ Place not found' });
        }
        if (name) {
            place.name = name;
            await place.save();
        }
        res.status(200).json({ data: await communicationList() });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to update engineer',
            error: error.message
        });
    }
}
//delete communication
export const deleteCommunication = async (req, res) => {
    try {
        const { id } = req.params;

        const place = await byId(Place, id);
        if (!place) {
            return res.status(404).json({ message: '❌ Communication item not found' });
        }

        // place image + all engineer images
        const engineers = await Engineer.find({ place: place._id });
        await dropImages([imageOf(place), ...engineers.map(imageOf)]);

        await Engineer.deleteMany({ place: place._id });
        await place.deleteOne();

        res.status(200).json({
            message: '✅ Communication and all nested images deleted successfully',
            data: await communicationList()
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete communication',
            error: error.message
        });
    }
};

//add eng
export const addEngCommunication = async (req, res) => {
    try {
        const { id, name, phone } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: '❌ Image file is required' });
        }

        const place = await byId(Place, id);
        if (!place) {
            return res.status(404).json({ message: '❌ Place not found' });
        }

        const uploaded = await uploadImage(file.buffer);
        const engineer = await Engineer.create({ place: place._id, name, phone, img: toImg(uploaded) });

        res.status(200).json({
            message: '✅ Engineer added successfully',
            data: engineerShape(engineer.toObject())
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to add engineer',
            error: error.message
        });
    }
};
//get engs for place by id
export const getEngCommunicationById = async (req, res) => {
    try {
        const { id } = req.params;

        const place = await placeById(id);
        if (!place) {
            return res.status(404).json({ message: '❌ Place not found' });
        }

        res.status(200).json({
            message: '✅ Engineer fetched successfully',
            data: place
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to get engineer',
            error: error.message
        });
    }
};
export const updateEngById = async (req, res) => {
    try {
        const { placeId, engId } = req.params; // place _id and engineer _id from params
        const { name, phone } = req.body;
        const file = req.file;

        const place = await byId(Place, placeId);
        if (!place) return res.status(404).json({ message: '❌ Place not found' });

        const eng = await byId(Engineer, engId, { place: place._id });
        if (!eng) return res.status(404).json({ message: '❌ Engineer not found' });

        if (name) eng.name = name;
        if (phone) eng.phone = phone;
        if (file) {
            await swapImage(eng, file);
        }
        await eng.save();

        res.status(200).json({
            message: '✅ Engineer updated successfully',
            data: engineerShape(eng.toObject()),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to update engineer',
            error: error.message,
        });
    }
};

export const deleteEngById = async (req, res) => {
    try {
        const { placeId, engId } = req.params;

        const place = await byId(Place, placeId);
        if (!place) return res.status(404).json({ message: '❌ Place not found' });

        const engineer = await byId(Engineer, engId, { place: place._id });
        if (!engineer) return res.status(404).json({ message: '❌ Engineer not found' });

        await dropImages([imageOf(engineer)]);
        await engineer.deleteOne();

        res.status(200).json({
            message: '✅ Engineer deleted successfully',
            data: await engineersOf(place._id),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete engineer',
            error: error.message,
        });
    }
};
// get insecticide
export const getInsecticideData = async (req, res) => {
    try {
        res.status(200).json({
            data: await insecticideData(),
        });
    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete engineer',
            error: error.message,
        });
    }
}
//add data
export const addInsecticideData = async (req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(404).json({ message: '❌ No file found' });
        }
        if (!name) {
            return res.status(404).json({ message: '❌ No name found' });
        }
        const uploaded = await uploadImage(file.buffer);
        await InsecticideCategory.create({ name, img: toImg(uploaded) });

        res.status(200).json({
            data: await insecticideList(),
        });
    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to add data',
            error: error.message,
        });
    }
}
//delete
export const deleteInsecticideData = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: '❌ No id provided' });
        }

        const category = await byId(InsecticideCategory, id);
        if (!category) {
            return res.status(404).json({ message: '❌ Category not found' });
        }

        // category image + all nested Type images
        const types = await InsecticideType.find({ category: category._id });
        await dropImages([imageOf(category), ...types.map(imageOf)]);

        await InsecticideType.deleteMany({ category: category._id });
        await category.deleteOne();

        res.status(200).json({
            message: '✅ Category and nested images deleted successfully',
            data: await insecticideList(),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete category',
            error: error.message,
        });
    }
};

// update
export const updateInsecticideData = async (req, res) => {
    try {
        const { name, id } = req.body;
        const file = req.file;

        if (!id) {
            return res.status(400).json({ message: '❌ No id provided' });
        }

        const insecticide = await byId(InsecticideCategory, id);
        if (!insecticide) {
            return res.status(404).json({ message: '❌ Category not found' });
        }

        if (name) {
            insecticide.name = name;
        }
        if (file) {
            await swapImage(insecticide, file);
        }
        await insecticide.save();

        res.status(200).json({
            message: '✅ Insecticide category updated successfully',
            data: await insecticideCategoryById(id),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to update data',
            error: error.message,
        });
    }
};

//insecticide type
export const getInsecticideTypes = async (req, res) => {
    try {
        const { catId } = req.params;

        const category = await byId(InsecticideCategory, catId);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        res.status(200).json({ data: await insecticideTypes(category._id) });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to fetch types', error: error.message });
    }
};

export const addInsecticideType = async (req, res) => {
    try {
        const { name, description, id, company } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ message: '❌ Image file is required' });

        const category = await byId(InsecticideCategory, id);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        const uploaded = await uploadImage(file.buffer);
        await InsecticideType.create({ category: category._id, name, description, img: toImg(uploaded), company });

        res.status(200).json({ message: '✅ Type added', data: await insecticideTypes(category._id) });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to add type', error: error.message });
    }
};

export const updateInsecticideType = async (req, res) => {
    try {
        const { catId, typeId } = req.params;
        const { name, description, company } = req.body;
        const file = req.file;

        const category = await byId(InsecticideCategory, catId);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        const type = await byId(InsecticideType, typeId, { category: category._id });
        if (!type) return res.status(404).json({ message: '❌ Type not found' });

        if (name) type.name = name;
        if (description) type.description = description;
        if (file) {
            await swapImage(type, file);
        }
        if (company) {
            type.company = company;
        }
        await type.save();

        res.status(200).json({ message: '✅ Type updated', data: insecticideTypeShape(type.toObject()) });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to update type', error: error.message });
    }
};

export const deleteInsecticideType = async (req, res) => {
    try {
        const { catId, typeId } = req.params;

        const category = await byId(InsecticideCategory, catId);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        const type = await byId(InsecticideType, typeId, { category: category._id });
        if (!type) return res.status(404).json({ message: '❌ Type not found' });

        await dropImages([imageOf(type)]);
        await type.deleteOne();

        res.status(200).json({ message: '✅ Type deleted', data: await insecticideTypes(category._id) });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete type', error: error.message });
    }
};

//Fertilizer
export const getFertilizerdata = async (req, res) => {
    try {
        res.status(200).json({ data: await fertilizerList() });

    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete type', error: error.message });
    }
}

export const addFertilizerdata = async (req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;
        if (!name) return res.status(400).json({ message: '❌ name is required' });
        if (!file) return res.status(400).json({ message: '❌ Image file is required' });

        const uploaded = await uploadImage(file.buffer);
        await FertilizerCategory.create({ name, img: toImg(uploaded) });

        res.status(200).json({ data: await fertilizerList() });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete type', error: error.message });
    }
}

export const updateFertilizerdata = async (req, res) => {
    try {
        const { name, id } = req.body;
        const file = req.file;

        if (!id) return res.status(400).json({ message: '❌ id is required' });
        const selected = await byId(FertilizerCategory, id);
        if (!selected) return res.status(404).json({ message: '❌ Category not found' });

        if (name) {
            selected.name = name;
        }
        if (file) {
            await swapImage(selected, file);
        }
        await selected.save();
        res.status(200).json({ data: await fertilizerList() });
    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete type', error: error.message });
    }
}
export const deleteFertilizerdata = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: '❌ No id provided' });
        }

        const category = await byId(FertilizerCategory, id);
        if (!category) {
            return res.status(404).json({ message: '❌ Category not found' });
        }

        // category image + level 1 and level 2 type images
        const types = await FertilizerType.find({ category: category._id });
        await dropImages([imageOf(category), ...types.map(imageOf)]);

        await FertilizerType.deleteMany({ category: category._id });
        await category.deleteOne();

        res.status(200).json({
            message: '✅ Fertilizer category and nested images deleted successfully',
            data: await fertilizerList(),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete Fertilizer category',
            error: error.message,
        });
    }
};

//Fertilizer type1
export const getFertilizerType = async (req, res) => {
    try {
        const { id } = req.params;
        const type = await fertilizerCategoryById(id);
        if (!type) {
            return res.status(404).json({ message: '❌ type not found' });
        }
        res.status(200).json({ data: type });
    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to get type',
            error: error.message,
        });
    }
}
export const addFertilizerType = async (req, res) => {
    try {
        const { id, name, haveType, company, description } = req.body;
        const file = req.file;

        if (!id) return res.status(400).json({ message: '❌ id is required' });
        if (!name) return res.status(400).json({ message: '❌ name is required' });
        if (!file) return res.status(400).json({ message: '❌ Image file is required' });

        const category = await byId(FertilizerCategory, id);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        const uploaded = await uploadImage(file.buffer);

        const newType = { category: category._id, parent: null, name, img: toImg(uploaded) };

        if (!haveType || haveType === 'false' || (!!company && !!description)) {
            // Add as a leaf type (no nested types)
            newType.company = company;
            newType.description = description;
        }
        // otherwise it is a parent type that can contain sub-types
        await FertilizerType.create(newType);

        res.status(200).json({ message: '✅ Type added successfully', data: await fertilizerTypes(category._id) });

    } catch (error) {
        res.status(500).json({ message: '❌ Failed to add type', error: error.message });
    }
};
export const updateFertilizerType = async (req, res) => {
    try {
        const { categoryId, typeId, name, company, description } = req.body;
        const file = req.file;

        if (!categoryId || !typeId) {
            return res.status(400).json({ message: '❌ categoryId and typeId are required' });
        }

        const category = await byId(FertilizerCategory, categoryId);
        if (!category) {
            return res.status(404).json({ message: '❌ Category not found' });
        }

        const type = await byId(FertilizerType, typeId, { category: category._id, parent: null });
        if (!type) {
            return res.status(404).json({ message: '❌ Type not found in this category' });
        }

        // Update fields
        if (name) type.name = name;
        if (company) type.company = company;
        if (description) type.description = description;
        if (file) {
            await swapImage(type, file);
        }
        await type.save();

        res.status(200).json({
            message: '✅ Type updated successfully',
            data: fertTypeShape(type.toObject(), await FertilizerType.find({ parent: type._id }).sort({ _id: 1 }).lean()),
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to update type',
            error: error.message,
        });
    }
};
export const deleteFertilizerType = async (req, res) => {
    try {
        const { categoryId, typeId } = req.params;

        if (!categoryId || !typeId) {
            return res.status(400).json({ message: '❌ categoryId and typeId are required' });
        }

        const category = await byId(FertilizerCategory, categoryId);
        if (!category) {
            return res.status(404).json({ message: '❌ Fertilizer category not found' });
        }

        const type = await byId(FertilizerType, typeId, { category: category._id, parent: null });
        if (!type) {
            return res.status(404).json({ message: '❌ Fertilizer type not found in this category' });
        }

        // the type image + its nested type images
        const nested = await FertilizerType.find({ parent: type._id });
        await dropImages([imageOf(type), ...nested.map(imageOf)]);

        await FertilizerType.deleteMany({ parent: type._id });
        await type.deleteOne();

        res.status(200).json({
            message: '✅ Fertilizer type and nested images deleted successfully',
            data: await fertilizerTypes(category._id)
        });

    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to delete fertilizer type',
            error: error.message,
        });
    }
};

//Fertilizer type2
// the level-1 type that owns the nested types, or an error response already sent (null)
const findParentType = async (res, categoryId, typeId) => {
    const category = await byId(FertilizerCategory, categoryId);
    if (!category) {
        res.status(404).json({ message: '❌ Fertilizer category not found' });
        return null;
    }
    const type = await byId(FertilizerType, typeId, { category: category._id, parent: null });
    if (!type) {
        res.status(404).json({ message: '❌ Fertilizer type not found in this category' });
        return null;
    }
    return type;
};
export const getFertilizerNestedType = async (req, res) => {
    try {
        const { categoryId, typeId } = req.params;

        if (!categoryId || !typeId) {
            return res.status(400).json({ message: '❌ categoryId and typeId are required' });
        }

        const type = await findParentType(res, categoryId, typeId);
        if (!type) return;

        res.status(200).json({ data: await fertilizerNested(type._id) });
    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to get nested type',
            error: error.message,
        });
    }
}
export const addFertilizerNestedType = async (req, res) => {
    try {
        const { categoryId, typeId, name, company, description } = req.body;
        const file = req.file;

        if (!categoryId || !typeId) {
            return res.status(400).json({ message: '❌ categoryId and typeId are required' });
        }
        if (!name || !company || !description) {
            return res.status(400).json({ message: '❌ data are required' });
        }

        const type = await findParentType(res, categoryId, typeId);
        if (!type) return;

        if (!file) return res.status(400).json({ message: '❌ Image file is required' });
        const uploaded = await uploadImage(file.buffer);

        await FertilizerType.create({
            category: type.category,
            parent: type._id,
            name,
            company,
            description,
            img: toImg(uploaded),
        });

        res.status(200).json({ data: await fertilizerNested(type._id), message: "Fertilizer adding successfully" });
    } catch (error) {
        res.status(500).json({
            message: '❌ Failed to add nested type',
            error: error.message,
        });
    }
}
export const updateFertilizerNestedType = async (req, res) => {
    try {
        const { categoryId, typeId, nestedTypeId, name, company, description } = req.body;
        const file = req.file;

        if (!categoryId || !typeId || !nestedTypeId) {
            return res.status(400).json({ message: '❌ Required IDs are missing' });
        }

        const category = await byId(FertilizerCategory, categoryId);
        if (!category) return res.status(404).json({ message: '❌ Category not found' });

        const type = await byId(FertilizerType, typeId, { category: category._id, parent: null });
        if (!type) return res.status(404).json({ message: '❌ Type not found' });

        const nested = await byId(FertilizerType, nestedTypeId, { parent: type._id });
        if (!nested) return res.status(404).json({ message: '❌ Nested type not found' });

        if (name) nested.name = name;
        if (company) nested.company = company;
        if (description) nested.description = description;
        if (file) {
            await swapImage(nested, file);
        }
        await nested.save();

        res.status(200).json({ data: await fertilizerNested(type._id) });

    } catch (error) {
        res.status(500).json({ message: '❌ Failed to update nested type', error: error.message });
    }
};

export const deleteFertilizerNestedType = async (req, res) => {
    try {
        const { categoryId, typeId, nestedTypeId } = req.params;

        if (!categoryId || !typeId || !nestedTypeId) {
            return res.status(400).json({ message: '❌ categoryId, typeId, and nestedTypeId are required' });
        }

        const category = await byId(FertilizerCategory, categoryId);
        if (!category) return res.status(404).json({ message: '❌ Fertilizer category not found' });

        const type = await byId(FertilizerType, typeId, { category: category._id, parent: null });
        if (!type) return res.status(404).json({ message: '❌ Fertilizer type not found' });

        const nested = await byId(FertilizerType, nestedTypeId, { parent: type._id });
        if (!nested) return res.status(404).json({ message: '❌ Nested type not found' });

        await dropImages([imageOf(nested)]);
        await nested.deleteOne();

        res.status(200).json({ message: '✅ Nested type deleted', data: await fertilizerNested(type._id) });

    } catch (error) {
        res.status(500).json({ message: '❌ Failed to delete nested type', error: error.message });
    }
};
