import { create } from 'zustand';
type Booking = { restaurantId:string|null; reservationId:string|null; date:string; time:string; partySize:number; tableId:string|null; tableLabel:string; specialRequest:string; set:(values:Partial<Omit<Booking,'set'|'reset'>>)=>void; reset:()=>void };
const initial={restaurantId:null,reservationId:null,date:'',time:'19:00',partySize:2,tableId:null,tableLabel:'',specialRequest:''};
export const useBooking=create<Booking>(set=>({...initial,set:values=>set(values),reset:()=>set(initial)}));
