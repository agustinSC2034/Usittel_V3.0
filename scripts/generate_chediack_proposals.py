from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from textwrap import wrap

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
ASSETS = ROOT / "assets" / "img" / "propuestas"
SOURCE = Path(r"C:\Users\Aguus\OneDrive\Escritorio\Propuesta_iTTel_Chediack_Mudanza.pdf")
W, H = A4
MARGIN = 18 * mm


@dataclass(frozen=True)
class Proposal:
    slug: str
    name: str
    short: str
    cuit: str
    address: str
    web: str
    phone: str
    email: str
    reference: str
    logo: Path
    primary: colors.Color
    accent: colors.Color
    light: colors.Color
    block_a: str
    block_a_unit: str
    block_b: str
    block_b_unit: str
    total: str
    words: str
    foundation: str
    technical: bool


PROPOSALS = (
    Proposal(
        "Fiberquil", "FIBERQUIL S.R.L.", "Fiberquil", "30-70932604-6",
        "Av. Calchaquí 2371, Quilmes Oeste, Buenos Aires", "www.fiberquil.com.ar",
        "11 4250-0471", "info@fiberquil.com.ar", "FIBERQUIL-2026-0804-PBN-PAMPA - Rev. 01",
        ASSETS / "fiberquil-logo.png", colors.HexColor("#E45A24"), colors.HexColor("#183A5A"),
        colors.HexColor("#FFF2EA"), "USD 48.974,81", "USD 24.487,40 por sitio (referencial)",
        "USD 41.238,40", "USD 20.619,20 por sitio", "USD 90.213,21",
        "dólares estadounidenses noventa mil doscientos trece con 21/100", "USD 13.498,21", True,
    ),
    Proposal(
        "Bibop", "BIBOP S.A.", "Bibop", "30-71578682-2",
        "Carlos Pellegrini 855, piso 3, Ciudad Autónoma de Buenos Aires", "www.bibop.com.ar",
        "0800 362 2020", "gestion@bibop.com.ar", "BIBOP-2026-0804-PBN-PAMPA - Rev. 01",
        ASSETS / "bibop-logo.png", colors.HexColor("#6C35D7"), colors.HexColor("#6C35D7"),
        colors.HexColor("#F5F3F8"), "USD 52.252,21", "USD 26.126,10 por sitio (referencial)",
        "USD 43.998,08", "USD 21.999,04 por sitio", "USD 96.250,29",
        "dólares estadounidenses noventa y seis mil doscientos cincuenta con 29/100", "USD 14.401,51", False,
    ),
)


def split_lines(text: str, max_width: float, font: str, size: float) -> list[str]:
    paragraphs = text.split("\n")
    result: list[str] = []
    for paragraph in paragraphs:
        if not paragraph:
            result.append("")
            continue
        words = paragraph.split()
        line = ""
        for word in words:
            candidate = word if not line else f"{line} {word}"
            if stringWidth(candidate, font, size) <= max_width:
                line = candidate
            else:
                if line:
                    result.append(line)
                line = word
        if line:
            result.append(line)
    return result


def text(c, value, x, y, width, *, font="Helvetica", size=8.3, leading=11.5, color=colors.HexColor("#29343E"), align="left"):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in split_lines(value, width, font, size):
        if align == "right":
            c.drawRightString(x + width, y, line)
        elif align == "center":
            c.drawCentredString(x + width / 2, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y


def bullet_list(c, items, x, y, width, *, size=7.35, leading=9.6):
    for item in items:
        y = text(c, f"- {item}", x, y, width, size=size, leading=leading)
        y -= 2
    return y


def logo(c, p, x, y, max_w, max_h, centered=False):
    image = ImageReader(str(p.logo))
    iw, ih = image.getSize()
    ratio = min(max_w / iw, max_h / ih)
    dw, dh = iw * ratio, ih * ratio
    dx = x + (max_w - dw) / 2 if centered else x
    c.drawImage(image, dx, y - dh, dw, dh, mask="auto", preserveAspectRatio=True)
    return y - dh


def header_footer(c, p, page):
    if p.technical:
        c.setFillColor(p.primary)
        c.rect(0, H - 15 * mm, W, 15 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
    else:
        c.setStrokeColor(colors.HexColor("#D7D2DE"))
        c.line(MARGIN, H - 15 * mm, W - MARGIN, H - 15 * mm)
        c.setFillColor(p.primary)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(MARGIN, H - 10 * mm, p.name)
    c.setFont("Helvetica", 6.2)
    c.drawRightString(W - MARGIN, H - 10 * mm, p.reference)
    c.setStrokeColor(p.primary if p.technical else colors.HexColor("#8C8594"))
    c.setLineWidth(0.5)
    c.line(MARGIN, 16 * mm, W - MARGIN, 16 * mm)
    c.setFillColor(colors.HexColor("#59636C"))
    c.setFont("Helvetica", 5.6)
    c.drawString(MARGIN, 10.5 * mm, f"{p.address} | CUIT {p.cuit} | {p.web}")
    c.drawRightString(W - MARGIN, 10.5 * mm, f"Página {page} de 10")


def section(c, p, title, y):
    c.setFillColor(p.primary)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, y, title)
    c.setStrokeColor(p.primary)
    c.setLineWidth(0.7)
    c.line(MARGIN, y - 5, W - MARGIN, y - 5)
    return y - 18


def subsection(c, p, title, y):
    c.setFillColor(p.primary)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(MARGIN, y, title)
    return y - 13


def draw_table(c, p, headers, rows, widths, x, y, *, size=6.8, leading=8.2, header=True, first_col_fill=False):
    def row_height(row, bold=False):
        font = "Helvetica-Bold" if bold else "Helvetica"
        line_counts = [len(split_lines(str(cell), widths[i] - 8, font, size)) for i, cell in enumerate(row)]
        return max(20, max(line_counts) * leading + 8)

    if header:
        h = row_height(headers, True)
        c.setFillColor(p.primary)
        c.rect(x, y - h, sum(widths), h, fill=1, stroke=0)
        cx = x
        for i, value in enumerate(headers):
            text(c, str(value), cx + 4, y - 6, widths[i] - 8, font="Helvetica-Bold", size=size, leading=leading, color=colors.white)
            cx += widths[i]
        y -= h
    for index, row in enumerate(rows):
        h = row_height(row)
        c.setFillColor(p.light if index % 2 else colors.white)
        c.rect(x, y - h, sum(widths), h, fill=1, stroke=0)
        if first_col_fill:
            c.setFillColor(p.light)
            c.rect(x, y - h, widths[0], h, fill=1, stroke=0)
        cx = x
        for i, value in enumerate(row):
            c.setStrokeColor(colors.HexColor("#C7D0D8"))
            c.rect(cx, y - h, widths[i], h, fill=0, stroke=1)
            font = "Helvetica-Bold" if (i == 0 and first_col_fill) else "Helvetica"
            text(c, str(value), cx + 4, y - 6, widths[i] - 8, font=font, size=size, leading=leading)
            cx += widths[i]
        y -= h
    return y


def start_page(c, p, page):
    if page > 1:
        header_footer(c, p, page)
    return H - (24 * mm if page > 1 else 0)


def end_page(c):
    c.showPage()


def cover_page(c, p):
    if p.technical:
        c.setFillColor(p.primary); c.rect(0, H - 48 * mm, W, 48 * mm, fill=1, stroke=0)
        c.setFillColor(p.accent); c.rect(0, 0, 9 * mm, H, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 13); c.drawString(20 * mm, H - 29 * mm, "PROPUESTA TÉCNICO-COMERCIAL")
        y = H - 61 * mm
        y = logo(c, p, 20 * mm, y, 112 * mm, 23 * mm)
        title_align = "left"
    else:
        c.setStrokeColor(p.primary); c.line(22 * mm, H - 49 * mm, W - 22 * mm, H - 49 * mm); c.line(22 * mm, 25 * mm, W - 22 * mm, 25 * mm)
        y = H - 21 * mm
        y = logo(c, p, 0, y, W, 32 * mm, centered=True)
        y -= 21 * mm
        text(c, "PROPUESTA TÉCNICO-COMERCIAL", MARGIN, y, W - 2 * MARGIN, font="Helvetica", size=9, leading=11, color=p.primary, align="center")
        y -= 21
        title_align = "center"
    y -= 15
    y = text(c, "MUDANZA INTEGRAL LLAVE EN MANO\nDE SITIOS DE TELEFONÍA MÓVIL", MARGIN, y, W - 2 * MARGIN, font="Helvetica-Bold", size=19, leading=23, color=p.primary, align=title_align)
    y -= 7
    y = text(c, "Obra civil | Estructura | Electrónica | Integración y puesta en servicio", MARGIN, y, W - 2 * MARGIN, size=8.5, leading=11, color=colors.HexColor("#52606B"), align=title_align)
    y -= 13
    meta = [
        ("REFERENCIA", p.reference), ("CLIENTE", "José J. Chediack S.A.I.C.A."),
        ("PROYECTO", "Proyecto Ejecutivo y Construcción del Paso Bajo Nivel y Anillo Peatonal Av. Pampa"),
        ("MODALIDAD", "Llave en mano (obra civil, estructura, electrónica y puesta en servicio)"),
        ("OBJETO", "Mudanza integral de dos (2) sitios de telefonía móvil - Claro y Movistar"),
        ("EMISIÓN", "5 de agosto de 2026"), ("VALIDEZ", "30 (treinta) días corridos"),
    ]
    y = draw_table(c, p, [], meta, [34 * mm, 131 * mm], MARGIN, y, size=6.7, leading=8.2, header=False, first_col_fill=True)
    text(c, f"{p.name}\n{p.address}\nCUIT {p.cuit}", MARGIN, 48 * mm, W - 2 * MARGIN, font="Helvetica-Bold", size=7.2, leading=10, color=colors.HexColor("#46515B"), align="left" if p.technical else "center")
    end_page(c)


def letter_page(c, p):
    y = start_page(c, p, 2) - 9
    y = text(c, "Ciudad Autónoma de Buenos Aires, 5 de agosto de 2026", MARGIN, y, W - 2 * MARGIN, size=8.4, leading=12, align="right") - 18
    y = text(c, "Sres.\nJOSÉ J. CHEDIACK S.A.I.C.A.\nPBN Anillo Pampa - Unión Transitoria\nAt.: Gerencia de Obra / Departamento de Compras", MARGIN, y, W - 2 * MARGIN, font="Helvetica-Bold", size=8.5, leading=12) - 15
    paragraphs = [
        "De nuestra mayor consideración:",
        "Tenemos el agrado de dirigirnos a Uds. a fin de hacerles llegar nuestra propuesta técnico-comercial, bajo modalidad llave en mano, para la mudanza integral de los dos (2) sitios de telefonía móvil pertenecientes a Claro y Movistar, actualmente emplazados dentro de la traza de intervención del Paso Bajo Nivel y Anillo Peatonal de Av. Pampa.",
        "El alcance comprende la totalidad de las disciplinas involucradas: ingeniería, obra civil, desmontaje y montaje estructural, y de manera integral el desmontaje, traslado, montaje, configuración, integración y puesta en servicio de toda la electrónica de ambos sitios, incluyendo sistema radiante, unidades de radio, transmisión, fibra óptica y sistema de energía.",
        f"{p.short} asume la responsabilidad única por el resultado final: sitios operativos, integrados en la red del operador y con acta de aceptación emitida.",
        "Quedamos a disposición para ampliar cualquier aspecto técnico o comercial de la presente.",
        "Sin otro particular, saludamos a Uds. muy atentamente.",
    ]
    for value in paragraphs:
        y = text(c, value, MARGIN, y, W - 2 * MARGIN, size=8.5, leading=12) - 8
    y -= 28
    c.setStrokeColor(p.primary); c.line(MARGIN, y, MARGIN + 60 * mm, y); y -= 13
    text(c, f"{p.name}\nCUIT {p.cuit}\n{p.email} | {p.phone}", MARGIN, y, 80 * mm, font="Helvetica-Bold", size=7.3, leading=10)
    end_page(c)


def object_page(c, p):
    y = start_page(c, p, 3)
    y = section(c, p, "1  OBJETO Y MODALIDAD DE CONTRATACIÓN", y)
    paragraphs = [
        "La presente propuesta tiene por objeto la ejecución integral, bajo modalidad llave en mano, de la mudanza de dos (2) sitios de telefonía móvil correspondientes a los operadores Claro y Movistar, actualmente emplazados dentro de la zona de afectación de la obra, con estructuras soporte tipo monoposte de hasta 18 metros de altura.",
        "El alcance abarca desde la ingeniería de detalle hasta la puesta en servicio y aceptación final del sitio por parte del operador, comprendiendo las nuevas fundaciones, la recuperación, traslado e izaje de las estructuras, y la reinstalación, configuración e integración de la totalidad de la electrónica.",
        f"{p.short} actúa como interlocutor único frente a la Contratista, asumiendo la coordinación con ambos operadores, la gestión de ventanas y la responsabilidad por el resultado operativo. La Contratista recibe los sitios liberados, reubicados y funcionando.",
    ]
    for value in paragraphs:
        y = text(c, value, MARGIN, y, W - 2 * MARGIN, size=8.2, leading=11.5) - 7
    y = section(c, p, "2  DESCRIPCIÓN DE LOS SITIOS", y - 2)
    y = text(c, "Los dos sitios se encuentran sobre la traza del anillo peatonal de Av. Pampa. Ambas estructuras deben reubicarse hacia el sector noroeste, fuera del área de afectación de la obra, conforme a la planimetría de proyecto.", MARGIN, y, W - 2 * MARGIN, size=8.2, leading=11.5) - 9
    rows = [("CLARO", "Ubicación actual", "6.176.190,11", "6.368.454,26", "154,77 m"), ("CLARO", "Nueva ubicación proyectada", "6.176.274,96", "6.368.321,08", "154,77 m"), ("MOVISTAR", "Ubicación actual", "6.176.173,26", "6.368.480,60", "170,75 m"), ("MOVISTAR", "Nueva ubicación proyectada", "6.176.266,58", "6.368.333,46", "170,75 m")]
    y = draw_table(c, p, ["SITIO", "CONDICIÓN", "NORTE (m)", "ESTE (m)", "DISTANCIA"], rows, [25 * mm, 57 * mm, 29 * mm, 29 * mm, 25 * mm], MARGIN, y, size=6.6)
    y -= 10
    text(c, "Nota: las nuevas posiciones serán verificadas mediante replanteo topográfico previo a la obra civil. Cualquier corrimiento será informado y consensuado con la Inspección de Obra y con el operador correspondiente.", MARGIN, y, W - 2 * MARGIN, font="Helvetica-Oblique", size=6.7, leading=8.5, color=colors.HexColor("#5A6670"))
    end_page(c)


def scope_page_one(c, p):
    y = section(c, p, "3  ALCANCE TÉCNICO DE LOS TRABAJOS", start_page(c, p, 4))
    groups = [
        ("3.1 Ingeniería, relevamiento y gestión documental", ["Relevamiento de estructuras, anclajes, fundaciones y elementos de sujeción.", "Auditoría e inventario de antenas, radios, microondas, energía y acometidas, con registro de azimuts, tilts y cotas.", "Replanteo topográfico georreferenciado y estudio de suelos.", "Memorias de cálculo de fundación y verificación de la estructura recuperada, firmadas por profesional matriculado.", "MOP, gestión de ventanas ante Claro y Movistar, planos de proyecto y documentación conforme a obra."]),
        ("3.2 Obra civil - Fundaciones", ["Excavación, retiro y disposición del suelo excedente.", "Fundación tipo platea o monobloque de hasta 10 m3 por sitio, con hormigón de resistencia especificada.", "Armadura, jaula de anclaje, pernos y plantilla de montaje.", "Canalizaciones, cámaras, bases para gabinetes y acometidas de energía y fibra hasta el pie de estructura.", "Curado, control de nivelación y liberación para izaje."]),
        ("3.3 Desmontaje de electrónica y estructura", ["Ventana coordinada con el operador y corte programado para minimizar la indisponibilidad.", "Bajada, identificación y registro de antenas, RRU, enlaces MW, soportes, alimentadores y jumpers.", "Desmontaje de gabinete outdoor, BBU, rectificadores, baterías, tableros AC/DC, climatización y PAT.", "Resguardo cubierto y seguro, inventario firmado y trazabilidad por número de serie.", "Desmontaje de monoposte de hasta 18 m con equipo de izaje."]),
    ]
    for title, items in groups:
        y = subsection(c, p, title, y); y = bullet_list(c, items, MARGIN, y, W - 2 * MARGIN)
    end_page(c)


def scope_page_two(c, p):
    y = section(c, p, "3  ALCANCE TÉCNICO - CONTINUACIÓN", start_page(c, p, 5))
    groups = [
        ("3.4 Traslado, izaje y montaje estructural", ["Traslado de estructura, electrónica y accesorios hasta la nueva ubicación.", "Izaje con grúa adecuada, plan específico y personal habilitado.", "Aplomado, nivelación y torqueado final de la unión estructura-fundación."]),
        ("3.5 Sistema radiante y transmisión", ["Montaje de antenas, soportes, radios y enlaces en cotas, azimuts y tilts definidos.", "Alineación mediante GPS de precisión y protocolo de verificación.", "Tendido, fijación, conexionado y sellado de alimentadores, jumpers y puestas a tierra."]),
        ("3.6 Energía y protecciones", ["Instalación de gabinete outdoor, BBU, climatización, rectificadores, baterías y tableros AC/DC.", "PAT, protección contra descargas, medición, balizamiento si corresponde y alarmas."]),
        ("3.7 Fibra óptica y transmisión", ["Fusiones, conectorización, armado de ODF, ordenamiento de bandejas y certificación OTDR bidireccional."]),
        ("3.8 Configuración, integración y puesta en servicio", ["Configuración de BBU, radios, transmisión y energía según parámetros del operador.", "Integración con OSS, alarmas y visibilidad en NOC.", "Ventana de swap con rollback validado.", "Soporte dedicado durante 72 horas y acta de aceptación."]),
    ]
    for title, items in groups:
        y = subsection(c, p, title, y); y = bullet_list(c, items, MARGIN, y, W - 2 * MARGIN)
    end_page(c)


def schedule_page(c, p):
    y = section(c, p, "3.9  ENSAYOS, PROTOCOLOS Y CIERRE", start_page(c, p, 6))
    y = bullet_list(c, ["Sweep test y DTF de líneas de transmisión, verificación de VSWR y trazas.", "Ensayo de PIM, mediciones de potencia y control de conformidad.", "Logística inversa hacia los depósitos TMA y CLARO que se indiquen.", "Limpieza y dossier as-built con planos, memorias, inventario, protocolos y registro fotográfico."], MARGIN, y, W - 2 * MARGIN)
    y = section(c, p, "4  PLAZO DE EJECUCIÓN", y - 5)
    y = text(c, "El plazo total es de sesenta (60) días corridos desde el pago del anticipo. El programa considera tareas simultáneas y una única ventana coordinada por operador para la electrónica de cada sitio.", MARGIN, y, W - 2 * MARGIN, size=7.5, leading=9.6) - 8
    rows = [("E1", "Relevamiento, replanteo, auditoría e ingeniería", "7 días", "Día 7"), ("E2", "Aprobación de memorias, MOP y ventanas", "12 días", "Día 19"), ("E3", "Fundaciones y curado", "18 días", "Día 37"), ("E4", "Desmontaje, resguardo y traslado", "6 días", "Día 43"), ("E5", "Izaje, montaje y aplomado", "5 días", "Día 48"), ("E6", "Sistema radiante, energía y fibra", "6 días", "Día 54"), ("E7", "Configuración, integración y swap", "4 días", "Día 58"), ("E8", "Ensayos, logística inversa y dossier", "2 días", "Día 60")]
    y = draw_table(c, p, ["ETAPA", "ACTIVIDAD", "DURACIÓN", "ACUMULADO"], rows, [18 * mm, 103 * mm, 23 * mm, 23 * mm], MARGIN, y, size=6.5)
    y -= 10
    text(c, "El plazo no incluye aprobaciones de terceros ni la asignación de ventanas de swap por Claro y Movistar. Estas gestiones serán realizadas por el Contratista, pero están fuera de su control directo.", MARGIN, y, W - 2 * MARGIN, font="Helvetica-Oblique", size=6.6, leading=8.3, color=colors.HexColor("#5A6670"))
    end_page(c)


def price_block(c, p, title, rows, y, total, unit):
    y = subsection(c, p, title, y)
    y = draw_table(c, p, ["ÍTEM", "DESCRIPCIÓN DEL TRABAJO", "UN.", "CANT."], rows, [15 * mm, 124 * mm, 15 * mm, 13 * mm], MARGIN, y, size=6.5)
    y -= 8
    c.setFillColor(p.light); c.setStrokeColor(p.primary); c.rect(MARGIN, y - 30, W - 2 * MARGIN, 30, fill=1, stroke=1)
    text(c, f"VALOR DEL BLOQUE: {total}\n{unit}", MARGIN + 8, y - 8, W - 2 * MARGIN - 16, font="Helvetica-Bold", size=7.5, leading=10, color=p.primary)
    return y - 40


def economy_page_a(c, p):
    y = section(c, p, "5  SEGURIDAD, HIGIENE Y MEDIO AMBIENTE", start_page(c, p, 7))
    y = text(c, f"{p.short} ejecutará los trabajos conforme a la Ley 19.587, el Decreto 911/96, la normativa SRT y los procedimientos de la Contratista.", MARGIN, y, W - 2 * MARGIN, size=7.4, leading=9.5) - 5
    y = bullet_list(c, ["Programa de Seguridad aprobado por ART.", "Personal registrado, ART con cláusula de no repetición y seguros.", "Análisis de riesgo y permisos para izaje, altura y tensión.", "Control de radiofrecuencia, bloqueo y consignación.", "Señalización, vallado, desvíos y gestión de residuos."], MARGIN, y, W - 2 * MARGIN, size=7, leading=9)
    y = section(c, p, "6  PROPUESTA ECONÓMICA", y - 5)
    y = text(c, "Presupuesto llave en mano para los dos (2) sitios. Valores expresados en dólares estadounidenses, IVA no incluido.", MARGIN, y, W - 2 * MARGIN, size=7.4, leading=9.5) - 8
    rows = [("1", "Ingeniería, relevamiento, auditoría, memorias de cálculo y gestión documental.", "Sitio", "2"), ("2", "Fundación hasta 10 m3, excavación, armadura, hormigonado y jaula de anclaje.", "Sitio", "2"), ("3", "Desmontaje de monoposte de hasta 18 m y demolición de fundación.", "Sitio", "2"), ("4", "Traslado, izaje, montaje, aplomado y torqueado final.", "Sitio", "2"), ("5", "Logística inversa TMA y CLARO, excedentes y disposición de residuos.", "Sitio", "2")]
    price_block(c, p, "BLOQUE A - INFRAESTRUCTURA CIVIL Y ESTRUCTURAL", rows, y, p.block_a, p.block_a_unit)
    end_page(c)


def economy_page_b(c, p):
    y = section(c, p, "6  PROPUESTA ECONÓMICA - CONTINUACIÓN", start_page(c, p, 8))
    rows = [("6", "Desmontaje, etiquetado, resguardo y traslado de antenas, RRU, BBU, MW, gabinetes y energía.", "Sitio", "2"), ("7", "Montaje del sistema radiante y transmisión, alimentadores, jumpers y sellado.", "Sitio", "2"), ("8", "Gabinete, rectificadores, baterías, tableros AC/DC, climatización, PAT y protecciones.", "Sitio", "2"), ("9", "Fibra, fusiones, ODF, conectorización y certificación OTDR.", "Sitio", "2"), ("10", "Configuración, integración OSS, commissioning, swap y soporte NOC 72 horas.", "Sitio", "2"), ("11", "Sweep test, DTF, PIM, alineación GPS, mediciones y dossier as-built.", "Sitio", "2")]
    y = price_block(c, p, "BLOQUE B - ELECTRÓNICA, INTEGRACIÓN Y PUESTA EN SERVICIO", rows, y, p.block_b, p.block_b_unit)
    y -= 10
    c.setFillColor(p.primary); c.rect(MARGIN, y - 48, W - 2 * MARGIN, 48, fill=1, stroke=0)
    text(c, "TOTAL GENERAL LLAVE EN MANO\n(IVA no incluido)", MARGIN + 10, y - 12, 90 * mm, font="Helvetica-Bold", size=9, leading=12, color=colors.white)
    text(c, p.total, MARGIN + 90 * mm, y - 17, W - 2 * MARGIN - 90 * mm - 10, font="Helvetica-Bold", size=18, leading=20, color=colors.white, align="right")
    y -= 64
    y = text(c, f"MONTO TOTAL LLAVE EN MANO: {p.total} ({p.words}), IVA no incluido.", MARGIN, y, W - 2 * MARGIN, font="Helvetica-Bold", size=8, leading=11) - 12
    c.setFillColor(p.light); c.setStrokeColor(p.primary); c.rect(MARGIN, y - 36, W - 2 * MARGIN, 36, fill=1, stroke=1)
    text(c, f"COTIZACIÓN DE FUNDACIÓN\nSi el comitente ejecuta cada fundación, se descontará {p.foundation} por cada una.", MARGIN + 8, y - 9, W - 2 * MARGIN - 16, font="Helvetica-Bold", size=7.2, leading=10, color=p.primary)
    end_page(c)


def terms_page(c, p):
    y = section(c, p, "7  CONDICIONES COMERCIALES", start_page(c, p, 9))
    rows = [("Modalidad", f"Llave en mano. {p.short} asume la responsabilidad por sitios reubicados, integrados y operativos."), ("Moneda", "Dólares estadounidenses (USD), sin IVA ni otros impuestos, tasas o contribuciones."), ("Pago en pesos", "ARS al tipo de cambio BNA, dólar billete vendedor, del día de pago."), ("Forma de pago", "40% contra orden de compra. Saldo por certificaciones mensuales a 30 días fecha de factura. El 10% final contra acta de aceptación."), ("Validez", "30 (treinta) días corridos desde la emisión."), ("Plazo de obra", "60 (sesenta) días corridos desde el pago del anticipo y la liberación de los frentes.")]
    y = draw_table(c, p, [], rows, [31 * mm, 136 * mm], MARGIN, y, size=6.7, header=False, first_col_fill=True) - 13
    y = section(c, p, "8  EXCLUSIONES", y)
    bullet_list(c, ["Estructuras portantes nuevas. Si alguna estructura existente no fuera apta, se cotizará aparte.", "Hardware nuevo: antenas, radios, BBU, transmisión, rectificadores y baterías.", "Licencias, ampliaciones o cambios de red no asociados a la mudanza.", "Refuerzos o reparaciones estructurales no detectables inicialmente.", "Acometida eléctrica definitiva, medidor y trámites ante la distribuidora.", "Tasas, derechos de construcción, aranceles municipales y sellados.", "Movimiento de suelos masivo, submuraciones, entibados o fundaciones profundas.", "Interferencias de terceros no relevadas ni indicadas en el proyecto.", "Vigilancia permanente del obrador y depósito fuera del predio."], MARGIN, y, W - 2 * MARGIN, size=6.9, leading=8.8)
    end_page(c)


def final_page(c, p):
    y = section(c, p, "9  CONSIDERACIONES FINALES", start_page(c, p, 10))
    y = text(c, "La propuesta se elaboró sobre la documentación suministrada por la Contratista y el análisis técnico de nuestro equipo. Toda modificación de alcance, ubicaciones, configuración de la electrónica o condiciones de ejecución dará lugar a la revisión de valores y plazo.", MARGIN, y, W - 2 * MARGIN, size=8.4, leading=12) - 10
    y = text(c, "Agradecemos la oportunidad de participar y quedamos a disposición para coordinar una reunión técnica o una visita conjunta a los sitios.", MARGIN, y, W - 2 * MARGIN, size=8.4, leading=12) - 50
    rows = [("POR EL OFERENTE", "CONFORMIDAD DEL CLIENTE"), ("\n\n\n", "\n\n\n"), (f"{p.name}\nCUIT {p.cuit}", "José J. Chediack S.A.I.C.A.\nFirma, aclaración y fecha")]
    y = draw_table(c, p, [], rows, [82 * mm, 82 * mm], MARGIN, y, size=7, leading=9, header=False) - 45
    logo(c, p, MARGIN + 45 * mm, y, 75 * mm, 18 * mm, centered=True)
    text(c, f"{p.address}\n{p.phone} | {p.email} | {p.web}", MARGIN, y - 26 * mm, W - 2 * MARGIN, size=7.2, leading=10, align="center")
    end_page(c)


def build(p: Proposal):
    output = OUTPUT / f"Propuesta_{p.slug}_Chediack_Mudanza.pdf"
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    c.setTitle(f"Propuesta {p.short} - Chediack - Mudanza de sitios")
    c.setAuthor(p.name)
    cover_page(c, p); letter_page(c, p); object_page(c, p); scope_page_one(c, p); scope_page_two(c, p)
    schedule_page(c, p); economy_page_a(c, p); economy_page_b(c, p); terms_page(c, p); final_page(c, p)
    c.save()
    pages = len(PdfReader(str(output)).pages)
    if pages != 10:
        raise RuntimeError(f"{output.name}: se esperaban 10 páginas y se generaron {pages}")
    return output


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    for proposal in PROPOSALS:
        if not proposal.logo.exists():
            raise FileNotFoundError(proposal.logo)
    original = OUTPUT / "Propuesta_iTTel_Chediack_Mudanza.pdf"
    shutil.copy2(SOURCE, original)
    outputs = [original] + [build(proposal) for proposal in PROPOSALS]
    for path in outputs:
        print(f"OK {path.name}: {len(PdfReader(str(path)).pages)} páginas, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
