import { create } from 'zustand';
import type { Product } from '@dineflow/shared';
type Item={product:Product;quantity:number};
type Cart={items:Item[];add:(product:Product)=>void;decrease:(id:string)=>void;remove:(id:string)=>void;clear:()=>void};
export const useCart=create<Cart>(set=>({
  items:[],
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
}));
