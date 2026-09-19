import {Coffee, Pizza, Soup, Croissant, Utensils} from 'lucide-react';
import {THEMES} from './library';

export function FoodIcon({theme='cafe',...props}) {
  const Icon = {cafe:Coffee,pizza:Pizza,ramen:Soup,empanadas:Croissant,custom:Utensils}[theme] || Utensils;
  return <Icon {...props}/>;
}
export function ThemeArt({theme='cafe',compact=false}) {
  const config=THEMES[theme] || THEMES.custom;
  return <div className={`food-art ${compact?'compact':''}`} aria-hidden="true">
    {config.image?<img src={`./${config.image}`} alt=""/>:<Utensils size={compact?44:74} strokeWidth={1}/>}
  </div>;
}
