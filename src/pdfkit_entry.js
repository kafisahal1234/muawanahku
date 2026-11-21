// Paket pembuat PDF (dimuat hanya saat mengunduh): jsPDF + AutoTable + html2canvas-pro + huruf Montserrat
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import html2canvas from "html2canvas-pro";
import { FONT_CSS } from "../vendor/pdf_fonts.js";
window.MKPDF = { jsPDF, autoTable, html2canvas, FONT_CSS };
