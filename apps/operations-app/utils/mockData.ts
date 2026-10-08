export type StaffUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  password: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: any;
};

export const owner = {
  dashboardName: 'Kasun',
  fullName: 'Lakvidu Rathnayaka',
  phone: '+94 71 92 77 149',
  email: 'Lakviduupasara@gmail.com',
  role: 'Owner • Manager',
};

export const staffUsers: StaffUser[] = [
  { id: 'ST-001', name: 'Thilina Fernando', phone: '071 234 5678', role: 'Waiter', password: '••••••••' },
  { id: 'ST-002', name: 'Samantha Dias', phone: '077 456 2381', role: 'Waiter', password: '••••••••' },
  { id: 'ST-003', name: 'Nisal Perera', phone: '076 341 9988', role: 'Cashier', password: '••••••••' },
  { id: 'ST-004', name: 'Hasith Silva', phone: '075 918 6642', role: 'Waiter', password: '••••••••' },
  { id: 'ST-005', name: 'Shenal Jayasuriya', phone: '078 220 4312', role: 'Kitchen', password: '••••••••' },
  { id: 'ST-006', name: 'Dinuka Peris', phone: '071 881 2211', role: 'Waiter', password: '••••••••' },
];

const chickenImage = require('../assets/images/product-chicken.png');

export const products: Product[] = [
  {
    id: 'P-001',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
  {
    id: 'P-002',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
  {
    id: 'P-003',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
  {
    id: 'P-004',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
  {
    id: 'P-005',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
  {
    id: 'P-006',
    name: 'Chicken Frederice',
    description: 'A comforting chicken rice dish served with fresh vegetables and a flavourful house sauce.',
    category: 'Main Course',
    price: 3.9,
    image: chickenImage,
  },
];

export const productCategories = [
  'Starter',
  'Main Course',
  'Dessert',
  'Soft Drink',
  'Hot Drink',
  'Side Dish',
];

export const reservationStats = {
  reservations: 8,
  users: 3,
  occupiedTables: 9,
  waiting: 6,
};


// Temporary frontend report data. This will be replaced with API/database data later.
export type ReservationRecord = {
  date: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';
  guests: number;
};

export type WalkInRecord = {
  date: string;
  status: 'Served' | 'Waiting' | 'No-show';
  guests: number;
};

export type QueueRecord = {
  date: string;
  status: 'Served' | 'Waiting' | 'No-show';
  waitMinutes: number;
};

export type TableUsageRecord = {
  date: string;
  occupiedTables: number;
  utilizationPercent: number;
};

const reportDate = (daysAgo: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

export const reservationRecords: ReservationRecord[] = [
  { date: reportDate(0), status: 'Confirmed', guests: 4 },
  { date: reportDate(0), status: 'Completed', guests: 2 },
  { date: reportDate(1), status: 'Completed', guests: 5 },
  { date: reportDate(1), status: 'Confirmed', guests: 3 },
  { date: reportDate(2), status: 'Cancelled', guests: 2 },
  { date: reportDate(3), status: 'Completed', guests: 6 },
  { date: reportDate(4), status: 'No-show', guests: 4 },
  { date: reportDate(6), status: 'Completed', guests: 2 },
  { date: reportDate(7), status: 'Confirmed', guests: 5 },
  { date: reportDate(9), status: 'Completed', guests: 4 },
  { date: reportDate(12), status: 'Cancelled', guests: 3 },
  { date: reportDate(14), status: 'Completed', guests: 6 },
];

export const walkInRecords: WalkInRecord[] = [
  { date: reportDate(0), status: 'Served', guests: 2 },
  { date: reportDate(0), status: 'Waiting', guests: 4 },
  { date: reportDate(1), status: 'Served', guests: 3 },
  { date: reportDate(2), status: 'Served', guests: 2 },
  { date: reportDate(3), status: 'No-show', guests: 2 },
  { date: reportDate(5), status: 'Served', guests: 5 },
  { date: reportDate(7), status: 'Served', guests: 4 },
  { date: reportDate(10), status: 'Waiting', guests: 3 },
  { date: reportDate(14), status: 'Served', guests: 2 },
];

export const queueRecords: QueueRecord[] = [
  { date: reportDate(0), status: 'Served', waitMinutes: 7 },
  { date: reportDate(0), status: 'Waiting', waitMinutes: 5 },
  { date: reportDate(1), status: 'Served', waitMinutes: 12 },
  { date: reportDate(2), status: 'Served', waitMinutes: 9 },
  { date: reportDate(3), status: 'No-show', waitMinutes: 18 },
  { date: reportDate(5), status: 'Served', waitMinutes: 6 },
  { date: reportDate(7), status: 'Waiting', waitMinutes: 10 },
  { date: reportDate(10), status: 'Served', waitMinutes: 14 },
  { date: reportDate(14), status: 'Served', waitMinutes: 8 },
];

export const tableUsageRecords: TableUsageRecord[] = [
  { date: reportDate(0), occupiedTables: 9, utilizationPercent: 75 },
  { date: reportDate(1), occupiedTables: 7, utilizationPercent: 58 },
  { date: reportDate(2), occupiedTables: 8, utilizationPercent: 67 },
  { date: reportDate(3), occupiedTables: 6, utilizationPercent: 50 },
  { date: reportDate(5), occupiedTables: 10, utilizationPercent: 83 },
  { date: reportDate(7), occupiedTables: 8, utilizationPercent: 67 },
  { date: reportDate(14), occupiedTables: 9, utilizationPercent: 75 },
];
