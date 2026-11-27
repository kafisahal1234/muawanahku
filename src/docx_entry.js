// Paket pembuat Word (.docx), dimuat hanya saat mengunduh
import * as docx from "docx";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
window.MKDOCX = docx;
window.MKZIP = { unzipSync, zipSync, strFromU8, strToU8 };
