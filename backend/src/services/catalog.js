// Reads the split collections and rebuilds the exact nested shapes the API has always returned
// (`{ _id, img, name, Type: [...] }` ...). Clients never see the new collection layout.
import mongoose from 'mongoose';
import {
  MainImage, MAIN_SECTIONS,
  SeedCategory, SeedType,
  FertilizerCategory, FertilizerType,
  InsecticideCategory, InsecticideType,
  Place, Engineer,
} from '../models/index.js';

const ID_RE = /^[0-9a-fA-F]{24}$/;

/** A valid ObjectId string, or null: unknown / malformed ids are "not found", never a cast error. */
export const asId = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : null);

export const newId = () => new mongoose.Types.ObjectId();

/** findById that answers null for anything that is not a well-formed id. */
export const byId = (Model, id, filter = {}) => {
  const ok = asId(id);
  return ok ? Model.findOne({ _id: ok, ...filter }) : Promise.resolve(null);
};

const compact = (o) => {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
};

const byCreation = { _id: 1 };

// Fixed ids for the section wrappers (`data.seeds._id` ...), so the shape keeps its `_id` key.
const SECTION_IDS = {
  seeds: '000000000000000000000001',
  Fertilizer: '000000000000000000000002',
  Insecticide: '000000000000000000000003',
  Communication: '000000000000000000000004',
};
const wrap = (section, data) => ({ _id: SECTION_IDS[section], data });

const group = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const k = String(row[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
};

// ---- shapes -------------------------------------------------------------------------------

const seedDescription = (d) => {
  if (!d) return undefined;
  const out = compact({ img: d.img, name: d.name, company: d.company, description: d.description });
  return Object.keys(out).length ? out : undefined;
};
export const seedTypeShape = (t) => compact({ _id: t._id, img: t.img, name: t.name, description: seedDescription(t.description) });
export const seedCategoryShape = (c, types = []) => compact({ _id: c._id, img: c.img, name: c.name, Type: types.map(seedTypeShape) });

export const fertNestedShape = (t) => compact({ _id: t._id, name: t.name, img: t.img, company: t.company, description: t.description });
export const fertTypeShape = (t, nested = []) =>
  compact({ _id: t._id, name: t.name, img: t.img, company: t.company, description: t.description, Type: nested.map(fertNestedShape) });
export const fertCategoryShape = (c, types = []) => compact({ _id: c._id, name: c.name, img: c.img, Type: types });

export const insecticideTypeShape = (t) => compact({ _id: t._id, name: t.name, img: t.img, description: t.description, company: t.company });
export const insecticideCategoryShape = (c, types = []) => compact({ _id: c._id, img: c.img, name: c.name, Type: types.map(insecticideTypeShape) });

export const engineerShape = (e) => compact({ _id: e._id, img: e.img, name: e.name, phone: e.phone });
export const placeShape = (p, engs = []) => compact({ _id: p._id, img: p.img, name: p.name, eng: engs.map(engineerShape) });

// ---- seeds --------------------------------------------------------------------------------

export const seedsList = async () => {
  const [cats, types] = await Promise.all([
    SeedCategory.find().sort(byCreation).lean(),
    SeedType.find().sort(byCreation).lean(),
  ]);
  const byCat = group(types, 'category');
  return cats.map((c) => seedCategoryShape(c, byCat.get(String(c._id))));
};
export const seedsData = async () => wrap('seeds', await seedsList());
export const seedCategoryById = async (id) => {
  const c = await byId(SeedCategory, id).then((d) => d?.toObject());
  if (!c) return null;
  return seedCategoryShape(c, await SeedType.find({ category: c._id }).sort(byCreation).lean());
};

// ---- fertilizer ---------------------------------------------------------------------------

export const fertilizerList = async () => {
  const [cats, types] = await Promise.all([
    FertilizerCategory.find().sort(byCreation).lean(),
    FertilizerType.find().sort(byCreation).lean(),
  ]);
  const level1 = types.filter((t) => !t.parent);
  const children = group(types.filter((t) => t.parent), 'parent');
  const l1ByCat = group(level1, 'category');
  return cats.map((c) =>
    fertCategoryShape(c, (l1ByCat.get(String(c._id)) || []).map((t) => fertTypeShape(t, children.get(String(t._id))))));
};
export const fertilizerTypes = async (categoryId) => {
  const types = await FertilizerType.find({ category: categoryId, parent: null }).sort(byCreation).lean();
  const children = group(await FertilizerType.find({ category: categoryId, parent: { $ne: null } }).sort(byCreation).lean(), 'parent');
  return types.map((t) => fertTypeShape(t, children.get(String(t._id))));
};
export const fertilizerCategoryById = async (id) => {
  const c = await byId(FertilizerCategory, id).then((d) => d?.toObject());
  if (!c) return null;
  return fertCategoryShape(c, await fertilizerTypes(c._id));
};
export const fertilizerNested = async (typeId) =>
  (await FertilizerType.find({ parent: typeId }).sort(byCreation).lean()).map(fertNestedShape);

// ---- insecticide --------------------------------------------------------------------------

export const insecticideList = async () => {
  const [cats, types] = await Promise.all([
    InsecticideCategory.find().sort(byCreation).lean(),
    InsecticideType.find().sort(byCreation).lean(),
  ]);
  const byCat = group(types, 'category');
  return cats.map((c) => insecticideCategoryShape(c, byCat.get(String(c._id))));
};
export const insecticideData = async () => wrap('Insecticide', await insecticideList());
export const insecticideTypes = async (categoryId) =>
  (await InsecticideType.find({ category: categoryId }).sort(byCreation).lean()).map(insecticideTypeShape);
export const insecticideCategoryById = async (id) => {
  const c = await byId(InsecticideCategory, id).then((d) => d?.toObject());
  if (!c) return null;
  return insecticideCategoryShape(c, await InsecticideType.find({ category: c._id }).sort(byCreation).lean());
};

// ---- communication ------------------------------------------------------------------------

export const communicationList = async () => {
  const [places, engs] = await Promise.all([
    Place.find().sort(byCreation).lean(),
    Engineer.find().sort(byCreation).lean(),
  ]);
  const byPlace = group(engs, 'place');
  return places.map((p) => placeShape(p, byPlace.get(String(p._id))));
};
export const communicationData = async () => wrap('Communication', await communicationList());
export const placeById = async (id) => {
  const p = await byId(Place, id).then((d) => d?.toObject());
  if (!p) return null;
  return placeShape(p, await Engineer.find({ place: p._id }).sort(byCreation).lean());
};
export const engineersOf = async (placeId) =>
  (await Engineer.find({ place: placeId }).sort(byCreation).lean()).map(engineerShape);

// ---- main (home screen) pictures ----------------------------------------------------------

export const mainImages = async () => {
  const rows = await MainImage.find().lean();
  const out = {};
  for (const section of MAIN_SECTIONS) {
    const row = rows.find((r) => r.section === section);
    if (row?.img) out[section] = { img: row.img };
  }
  return out;
};

// ---- everything ---------------------------------------------------------------------------

export const allData = async () => {
  const [seeds, fert, insect, comm, main] = await Promise.all([
    seedsData(), fertilizerList(), insecticideData(), communicationData(), mainImages(),
  ]);
  return { seeds, Fertilizer: wrap('Fertilizer', fert), Insecticide: insect, Communication: comm, main };
};
