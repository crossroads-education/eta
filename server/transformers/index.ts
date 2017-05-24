import * as api from "../api";
import CssTransformer from "./CssTransformer";
import MvcPathTransformer from "./MvcPathTransformer";

export default function getAll(): (typeof api.IViewTransformer)[] {
    return [
        CssTransformer,
        MvcPathTransformer
    ];
}
