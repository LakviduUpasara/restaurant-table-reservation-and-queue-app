import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@dineflow/shared';
type Item={product:Product;quantity:number};
type Cart={ownerId:string|null;items:Item[];setOwner:(ownerId:string|null)=>void;add:(product:Product)=>void;decrease:(id:string)=>void;remove:(id:string)=>void;clear:()=>void};
export const useCart=create<Cart>()(persist(
  set=>({
    ownerId:null,
    items:[],
    setOwner:ownerId=>set(state=>state.ownerId===ownerId?{ownerId}:{ownerId,items:[]}),
    add:product=>set(state=>({
      items:state.items.some(i=>i.product.id===product.id)
        ?state.items.map(i=>i.product.id===product.id?{...i,quantity:i.quantity+1}:i)
        :[...state.items,{product,quantity:1}],
    })),
    decrease:id=>set(state=>({
      items:state.items.flatMap(i=>i.product.id!==id?i:i.quantity>1?{...i,quantity:i.quantity-1}:[]),
    })),
    remove:id=>set(state=>({items:state.items.filter(i=>i.product.id!==id)})),
    clear:()=>set({items:[]}),
  }),
  {
    name:'dineflow-customer-cart',
    storage:createJSONStorage(() => AsyncStorage),
    partialize:state=>({ownerId:state.ownerId,items:state.items}),
  },
));
