import { PiBug, PiFlask, PiPhoneCall, PiPlant } from 'react-icons/pi'
import api, { toFormData } from './client'

// Each catalog is a list of levels. A level knows how to list/add/update/remove its items;
// `ids` holds the ids of the parents picked so far (e.g. [categoryId, typeId]).
const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra })
const area = (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra })
const image = (required) => ({ name: 'image', label: 'Image', type: 'file', required })

const form = (path, values) => api.post(path, toFormData(values))

const countOf = (list, noun) => {
  const n = Array.isArray(list) ? list.length : 0
  return `${n} ${n === 1 ? noun : `${noun}s`}`
}

const hasSeedDescription = (item) =>
  Boolean(item.description?.name || item.description?.company || item.description?.description)

const seeds = {
  title: 'Seeds',
  accent: '#f7941d',
  icon: PiPlant,
  levels: [
    {
      noun: 'category',
      fields: [text('name', 'Name', { required: true }), image(true)],
      list: async () => (await api.get('/get-seeds-data')).data.data.data,
      add: (ids, v) => form('/add-seeds-categories', v),
      update: (ids, item, v) => form('/update-seeds-categories', { id: item._id, ...v }),
      remove: (ids, item) => api.delete(`/delete-seeds-categories/${item._id}`),
      subtitle: (item) => countOf(item.Type, 'type'),
    },
    {
      noun: 'type',
      fields: [text('name', 'Name', { required: true }), image(true)],
      list: async ([c]) => (await api.get(`/get-seeds-type/${c}`)).data.data.Type,
      add: ([c], v) => form('/add-seeds-type', { id: c, ...v }),
      update: (ids, item, v) => form('/update-seeds-type', { id: item._id, ...v }),
      remove: (ids, item) => api.delete(`/delete-seeds-type/${item._id}`),
      subtitle: (item) => item.description?.company || '',
      detail: {
        label: 'Description',
        fields: [text('name', 'Product name'), text('company', 'Company'), area('description', 'Description')],
        values: (item) => item.description || {},
        exists: hasSeedDescription,
        save: (item, v) => {
          const body = { name: v.name || '', company: v.company || '', description: v.description || '' }
          return hasSeedDescription(item)
            ? api.put(`/update-seeds-description/${item._id}`, body)
            : api.post(`/add-seeds-description/${item._id}`, body)
        },
        remove: (item) => api.delete(`/delete-seeds-description/${item._id}`),
      },
    },
  ],
}

const insecticide = {
  title: 'Insecticides',
  accent: '#006f54',
  icon: PiBug,
  levels: [
    {
      noun: 'category',
      fields: [text('name', 'Name', { required: true }), image(true)],
      list: async () => (await api.get('/get-insecticide-data')).data.data.data,
      add: (ids, v) => form('/add-insecticide-data', v),
      update: (ids, item, v) => form('/update-insecticide-data', { id: item._id, ...v }),
      remove: (ids, item) => api.delete(`/delete-insecticide-data/${item._id}`),
      subtitle: (item) => countOf(item.Type, 'product'),
    },
    {
      noun: 'product',
      fields: [
        text('name', 'Name', { required: true }),
        text('company', 'Company'),
        area('description', 'Description'),
        image(true),
      ],
      list: async ([c]) => (await api.get(`/get-insecticide-type/${c}`)).data.data,
      add: ([c], v) => form('/add-insecticide-type', { id: c, ...v }),
      update: ([c], item, v) => form(`/update-insecticide-type/${c}/${item._id}`, v),
      remove: ([c], item) => api.delete(`/delete-insecticide-type/${c}/${item._id}`),
      subtitle: (item) => item.company || '',
      leaf: true,
    },
  ],
}

// A fertilizer type is either a leaf (company + description) or a parent holding nested types.
const isParent = (item) => !item.company && !item.description

const fertilizer = {
  title: 'Fertilizers',
  accent: '#7b970c',
  icon: PiFlask,
  levels: [
    {
      noun: 'category',
      fields: [text('name', 'Name', { required: true }), image(true)],
      list: async () => (await api.get('/get-fertilizer-data')).data.data,
      add: (ids, v) => form('/add-fertilizer-data', v),
      update: (ids, item, v) => form('/update-fertilizer-data', { id: item._id, ...v }),
      remove: (ids, item) => api.delete(`/delete-fertilizer-data/${item._id}`),
      subtitle: (item) => countOf(item.Type, 'type'),
    },
    {
      noun: 'type',
      fields: [
        text('name', 'Name', { required: true }),
        { name: 'haveType', label: 'Contains sub-types', type: 'checkbox', onlyOnAdd: true },
        text('company', 'Company', { hideWhen: 'haveType' }),
        area('description', 'Description', { hideWhen: 'haveType' }),
        image(true),
      ],
      list: async ([c]) => (await api.get(`/get-fertilizer-type/${c}`)).data.data.Type,
      add: ([c], v) => {
        const { haveType, ...rest } = v
        return form(
          '/add-fertilizer-type',
          haveType
            ? { id: c, haveType: 'true', name: rest.name, image: rest.image }
            : { id: c, haveType: 'false', ...rest },
        )
      },
      update: ([c], item, v) => {
        const { haveType: _unused, ...rest } = v
        return form('/update-fertilizer-type', { categoryId: c, typeId: item._id, ...rest })
      },
      remove: ([c], item) => api.delete(`/delete-fertilizer-type/${c}/${item._id}`),
      hasChildren: isParent,
      subtitle: (item) => (isParent(item) ? countOf(item.Type, 'sub-type') : item.company || ''),
      // parent types hold no company/description, so only name + image are editable
      editFields: (item) => (isParent(item) ? ['name', 'image'] : null),
    },
    {
      noun: 'sub-type',
      fields: [
        text('name', 'Name', { required: true }),
        text('company', 'Company'),
        area('description', 'Description'),
        image(true),
      ],
      list: async ([c, t]) => (await api.get(`/get-fertilizer-nested-type/${c}/${t}`)).data.data,
      add: ([c, t], v) => form('/add-fertilizer-nested-type', { categoryId: c, typeId: t, ...v }),
      update: ([c, t], item, v) =>
        form('/update-fertilizer-nested-type', { categoryId: c, typeId: t, nestedTypeId: item._id, ...v }),
      remove: ([c, t], item) => api.delete(`/delete-fertilizer-nested-type/${c}/${t}/${item._id}`),
      subtitle: (item) => item.company || '',
      leaf: true,
    },
  ],
}

const communication = {
  title: 'Communication',
  accent: '#3b970c',
  icon: PiPhoneCall,
  levels: [
    {
      noun: 'place',
      noImage: true,
      fields: [text('name', 'Place name', { required: true })],
      list: async () => (await api.get('/get-communication-data')).data.data.data,
      add: (ids, v) => api.post('/add-communication-data', { name: v.name }),
      update: (ids, item, v) => api.post('/update-communication-data', { id: item._id, name: v.name }),
      remove: (ids, item) => api.delete(`/delete-communication-data/${item._id}`),
      subtitle: (item) => countOf(item.eng, 'engineer'),
    },
    {
      noun: 'engineer',
      fields: [
        text('name', 'Name', { required: true }),
        text('phone', 'Phone', { required: true, inputMode: 'tel' }),
        image(true),
      ],
      list: async ([p]) => (await api.get(`/get-communication-eng/${p}`)).data.data.eng,
      add: ([p], v) => form('/add-eng-data', { id: p, ...v }),
      update: ([p], item, v) => form(`/update-communication-eng/${p}/${item._id}`, v),
      remove: ([p], item) => api.delete(`/delete-communication-eng/${p}/${item._id}`),
      subtitle: (item) => item.phone,
      leaf: true,
    },
  ],
}

export const catalogs = { seeds, insecticide, fertilizer, communication }

export const MAIN_SECTIONS = [
  { key: 'seeds', label: 'Seeds' },
  { key: 'Fertilizer', label: 'Fertilizers' },
  { key: 'Insecticide', label: 'Insecticides' },
  { key: 'Communication', label: 'Communication' },
]

export const getMainImages = async () => (await api.get('/get-main-categories')).data.data
export const setMainImage = (section, hasImage, file) =>
  form(hasImage ? '/update-main-categories' : '/add-main-categories', { section, image: file })

export const getOverview = async () => (await api.get('/get-data')).data.data

export const usersApi = {
  list: async () => (await api.get('/get-users')).data.users,
  create: (v) => api.post('/register', v),
  remove: (id) => api.delete(`/delete-user-by-id/${id}`),
  resendVerification: (id) => api.get(`/verify-user/${id}`),
  resetPassword: (id, newPassword) => api.put(`/reset-user-password/${id}`, { newPassword }),
}

// Forgot-password: e-mail a code -> check the code -> set a new password
export const forgotApi = {
  request: (input) => api.post('/forgot-password', { input }),
  verify: (input, otp) => api.post('/verify-otp', { input, otp }),
  reset: (input, otp, newPassword) => api.post('/reset-password', { input, otp, newPassword }),
}

export const meRequest = async () => (await api.get('/me')).data.user

export const loginRequest = async (username, password) => (await api.post('/login', { username, password })).data

// The four sections shown in the app, with the accent the app itself uses for each.
export const SECTIONS = [
  { key: 'seeds', dataKey: 'seeds', to: '/seeds', label: 'Seeds', icon: PiPlant, accent: '#f7941d', appLabel: 'بذور' },
  { key: 'fertilizer', dataKey: 'Fertilizer', to: '/fertilizer', label: 'Fertilizers', icon: PiFlask, accent: '#7b970c', appLabel: 'اسمده' },
  { key: 'insecticide', dataKey: 'Insecticide', to: '/insecticide', label: 'Insecticides', icon: PiBug, accent: '#006f54', appLabel: 'مبيدات' },
  { key: 'communication', dataKey: 'Communication', to: '/communication', label: 'Communication', icon: PiPhoneCall, accent: '#3b970c', appLabel: 'تواصل معنا' },
]
