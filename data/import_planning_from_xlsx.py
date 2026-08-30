#!/usr/bin/env python3
"""Carga obligaciones desde kashflow-data (xlsx + detalle de préstamo BBVA).

No inserta transacciones: el libro diario queda intacto.
Idempotente: si ya existe 'Alquiler + Expensas', no vuelve a cargar.
"""
from __future__ import annotations

import calendar
import sqlite3
from datetime import date, datetime
from pathlib import Path

import openpyxl
import xlrd

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "kashflow.db"
DATA = ROOT / "kashflow-data"
XLSX = DATA / "Mis Gastos for Cursor.xlsx"
PRESTAMO = DATA / "BBVA" / "Prestamo" / "Detalle_prestamo_18_08_2026.xls"

USUARIO_ID = 1
CUENTA_BBVA = 3
CUENTA_MP = 1
TODAY = date(2026, 8, 18)


def clamp_day(year: int, month: int, day: int) -> date:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(max(int(day), 1), last))


def estado_para(fecha: date) -> str:
    return "vencido" if fecha < TODAY else "pendiente"


def parse_cuota_xls(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(".", "").replace(",", ".")
    return float(text)


def insert_compromiso(cur, nombre, tipo, frecuencia, dia, importe, cuenta_id):
    cur.execute(
        """INSERT INTO compromisos
           (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (USUARIO_ID, nombre, tipo, frecuencia, dia, importe, cuenta_id),
    )
    return cur.lastrowid


def insert_instancia(cur, compromiso_id, descripcion, periodo, fecha, importe, cuenta_id):
    cur.execute(
        """INSERT INTO instancias_compromiso
           (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento,
            importe_esperado, cuenta_pago_id, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            compromiso_id,
            USUARIO_ID,
            descripcion,
            periodo,
            fecha.isoformat(),
            importe,
            cuenta_id,
            estado_para(fecha),
        ),
    )
    return cur.lastrowid


def generar_mensual(cur, compromiso_id, nombre, dia, importe, cuenta_id, year, month):
    periodo = f"{year:04d}-{month:02d}"
    fecha = clamp_day(year, month, dia)
    existing = cur.execute(
        "SELECT id FROM instancias_compromiso WHERE compromiso_id = ? AND periodo = ?",
        (compromiso_id, periodo),
    ).fetchone()
    if existing:
        return
    insert_instancia(cur, compromiso_id, nombre, periodo, fecha, importe, cuenta_id)


def cargar_prestamo(cur):
    book = xlrd.open_workbook(str(PRESTAMO))
    sh = book.sheet_by_index(0)
    cid = insert_compromiso(
        cur, "Préstamo BBVA", "egreso", "unica", 10, 325293.33, CUENTA_BBVA
    )
    creadas = 0
    for r in range(3, sh.nrows):
        nro = str(sh.cell_value(r, 0)).strip()
        if not nro:
            continue
        vto_raw = str(sh.cell_value(r, 1)).strip()
        fecha = datetime.strptime(vto_raw, "%d/%m/%y").date()
        importe = parse_cuota_xls(sh.cell_value(r, 6))
        periodo = fecha.strftime("%Y-%m")
        insert_instancia(
            cur, cid, f"Préstamo BBVA cuota {nro}", periodo, fecha, importe, CUENTA_BBVA
        )
        creadas += 1
    return creadas


def main():
    if not XLSX.exists():
        raise SystemExit(f"No encuentro {XLSX}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    ya = cur.execute(
        "SELECT id FROM compromisos WHERE usuario_id = ? AND nombre = ?",
        (USUARIO_ID, "Alquiler + Expensas"),
    ).fetchone()
    if ya:
        print("Ya hay obligaciones cargadas (Alquiler + Expensas). No se duplica.")
        return

    wb = openpyxl.load_workbook(XLSX, data_only=True)
    fijos = wb["Agosto-Septiembre Gastos fijos"]
    mixto = wb["Agosto-Septiembre"]

    mensuales = {
        "Internet Concor": 5,
        "Internet Charru": 5,
        "Seguro": 10,
        "Netflix": 15,
        "DirecTV": 15,
        "Youtube": 15,
        "Alquiler + Expensas": 10,
        "Cochera": 10,
    }

    n_comp = 0
    n_inst = 0
    for row in fijos.iter_rows(min_row=2, values_only=True):
        nombre = (row[0] or "").strip() if isinstance(row[0], str) else None
        monto = row[1]
        if not nombre or nombre.upper() == "TOTAL" or monto is None:
            continue
        monto = float(monto)
        if nombre in mensuales:
            dia = mensuales[nombre]
            cid = insert_compromiso(
                cur, nombre, "egreso", "mensual", dia, monto, CUENTA_BBVA
            )
            n_comp += 1
            for year, month in ((2026, 8), (2026, 9)):
                generar_mensual(cur, cid, nombre, dia, monto, CUENTA_BBVA, year, month)
                n_inst += 1
        elif nombre.startswith("Cuota deposito alquiler"):
            cid = insert_compromiso(
                cur, "Depósito alquiler (cuotas)", "egreso", "unica", 10, monto, CUENTA_BBVA
            )
            n_comp += 1
            for i, (year, month) in enumerate(((2026, 8), (2026, 9)), start=2):
                fecha = clamp_day(year, month, 10)
                insert_instancia(
                    cur,
                    cid,
                    f"Depósito alquiler {i}/3",
                    f"{year:04d}-{month:02d}",
                    fecha,
                    monto,
                    CUENTA_BBVA,
                )
                n_inst += 1
        elif nombre.startswith("Cuota honorarios alquiler"):
            cid = insert_compromiso(
                cur, "Honorarios alquiler", "egreso", "unica", 10, monto, CUENTA_BBVA
            )
            n_comp += 1
            insert_instancia(
                cur, cid, "Honorarios alquiler 2/2", "2026-08", clamp_day(2026, 8, 10), monto, CUENTA_BBVA
            )
            n_inst += 1
        elif nombre.startswith("Cuota de medidor"):
            cid = insert_compromiso(
                cur, "Medidor de luz", "egreso", "unica", 10, monto, CUENTA_BBVA
            )
            n_comp += 1
            for i, (year, month) in enumerate(((2026, 8), (2026, 9), (2026, 10)), start=1):
                insert_instancia(
                    cur,
                    cid,
                    f"Medidor de luz {i}/3",
                    f"{year:04d}-{month:02d}",
                    clamp_day(year, month, 10),
                    monto,
                    CUENTA_BBVA,
                )
                n_inst += 1

    n_prestamo = cargar_prestamo(cur)
    n_comp += 1
    n_inst += n_prestamo

    visa_monto = float(mixto["B6"].value or 0)
    mc_monto = float(mixto["G6"].value or 0)
    mp_cuota_monto = float(mixto["B29"].value or 0)
    mp_cuota_vto = mixto["C29"].value.date()
    mp_mc_monto = float(mixto["B33"].value or 0)
    mp_mc_vto = mixto["C33"].value.date()

    cur.execute(
        """INSERT INTO tarjetas
           (usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (USUARIO_ID, "Visa BBVA", "visa-bbva", 30, 7, CUENTA_BBVA),
    )
    visa_id = cur.lastrowid
    cur.execute(
        """INSERT INTO tarjetas
           (usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (USUARIO_ID, "Mastercard BBVA", "mc-bbva", 27, 7, CUENTA_BBVA),
    )
    mc_id = cur.lastrowid

    insert_instancia(
        cur, None, "Resumen Visa BBVA", "2026-08", date(2026, 8, 7), visa_monto, CUENTA_BBVA
    )
    insert_instancia(
        cur, None, "Resumen Mastercard BBVA", "2026-08", date(2026, 8, 7), mc_monto, CUENTA_BBVA
    )
    n_inst += 2

    cid_mp = insert_compromiso(
        cur, "Crédito personal Mercado Pago", "egreso", "unica", 15, mp_cuota_monto, CUENTA_MP
    )
    insert_instancia(
        cur, cid_mp, "Crédito personal Mercado Pago", "2026-09", mp_cuota_vto, mp_cuota_monto, CUENTA_MP
    )
    n_comp += 1
    n_inst += 1

    cid_mp_mc = insert_compromiso(
        cur, "Mastercard Mercado Pago", "egreso", "unica", 1, mp_mc_monto, CUENTA_MP
    )
    insert_instancia(
        cur, cid_mp_mc, "Mastercard Mercado Pago 1/2", "2026-09", mp_mc_vto, mp_mc_monto, CUENTA_MP
    )
    insert_instancia(
        cur,
        cid_mp_mc,
        "Mastercard Mercado Pago 2/2",
        "2026-10",
        clamp_day(2026, 10, 1),
        mp_mc_monto,
        CUENTA_MP,
    )
    n_comp += 1
    n_inst += 2

    cid_carr = insert_compromiso(
        cur, "Cuota Carrefour Visa", "egreso", "unica", 7, 55500.0, CUENTA_BBVA
    )
    n_comp += 1
    start = date(2026, 9, 1)
    for i in range(18):
        month = start.month + i
        year = start.year + (month - 1) // 12
        month = (month - 1) % 12 + 1
        fecha = clamp_day(year, month, 7)
        insert_instancia(
            cur,
            cid_carr,
            f"Carrefour Concordia {i + 1}/18",
            fecha.strftime("%Y-%m"),
            fecha,
            55500.0,
            CUENTA_BBVA,
        )
        n_inst += 1

    consumos = [
        (visa_id, "YPF San Antonio", 50000.09, "2026-08-11 00:00:00", "1/1"),
        (visa_id, "Carrefour Concordia", 55500.0, "2026-08-10 00:00:00", "1/18"),
        (visa_id, "Carnicería 5ta Generación", 60880.0, "2026-08-02 00:00:00", "1/1"),
        (mc_id, "Estación servicio Esso", 60000.0, "2026-08-02 00:00:00", "1/1"),
    ]
    for tarjeta_id, desc, monto, fecha, cuotas in consumos:
        cur.execute(
            """INSERT INTO consumos_tarjeta
               (tarjeta_id, descripcion, monto, fecha_compra, cuotas)
               VALUES (?, ?, ?, ?, ?)""",
            (tarjeta_id, desc, monto, fecha, cuotas),
        )

    conn.commit()
    print(
        f"OK usuario={USUARIO_ID} compromisos={n_comp} instancias={n_inst} "
        f"tarjetas=2 consumos={len(consumos)} prestamo_cuotas={n_prestamo}"
    )
    print("Transacciones no modificadas.")


if __name__ == "__main__":
    main()
