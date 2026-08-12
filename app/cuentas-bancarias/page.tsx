"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Landmark, Loader2, Plus, Edit2, ToggleLeft, ToggleRight } from "lucide-react";

type CuentaBancaria = {
  id: string;
  banco: string;
  titular: string;
  alias: string;
  moneda: string;
  tipo_cuenta: string;
  nro_cuenta: string | null;
  chequera_actual: string | null;
  oficial: string | null;
  activo: boolean;
};

export default function CuentasBancarias() {
  const supabase = createClient();
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<CuentaBancaria | null>(null);
  const [showInactivas, setShowInactivas] = useState(false);

  const [banco, setBanco] = useState("");
  const [titular, setTitular] = useState("");
  const [alias, setAlias] = useState("");
  const [moneda, setMoneda] = useState("GS");
  const [tipoCuenta, setTipoCuenta] = useState("Cuenta Corriente");
  const [nroCuenta, setNroCuenta] = useState("");
  const [chequeraActual, setChequeraActual] = useState("");
  const [oficial, setOficial] = useState("");

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("cuentas_bancarias")
      .select("*")
      .order("alias");
    setCuentas((data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setBanco("");
    setTitular("");
    setAlias("");
    setMoneda("GS");
    setTipoCuenta("Cuenta Corriente");
    setNroCuenta("");
    setChequeraActual("");
    setOficial("");
    setEditando(null);
  }

  function abrirNuevo() {
    resetForm();
    setMostrarForm(true);
  }

  function abrirEditar(cuenta: CuentaBancaria) {
    setBanco(cuenta.banco);
    setTitular(cuenta.titular);
    setAlias(cuenta.alias);
    setMoneda(cuenta.moneda);
    setTipoCuenta(cuenta.tipo_cuenta);
    setNroCuenta(cuenta.nro_cuenta || "");
    setChequeraActual(cuenta.chequera_actual || "");
    setOficial(cuenta.oficial || "");
    setEditando(cuenta);
    setMostrarForm(true);
  }

  async function guardar() {
    if (!banco || !titular || !alias) {
      alert("Banco, titular y alias son obligatorios");
      return;
    }
    const payload = {
      banco: banco.toUpperCase(),
      titular: titular.toUpperCase(),
      alias: alias.toUpperCase(),
      moneda,
      tipo_cuenta: tipoCuenta,
      nro_cuenta: nroCuenta || null,
      chequera_actual: chequeraActual || null,
      oficial: oficial || null,
    };
    let error;
    if (editando) {
      const res = await supabase
        .from("cuentas_bancarias")
        .update(payload)
        .eq("id", editando.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("cuentas_bancarias")
        .insert(payload);
      error = res.error;
    }
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    resetForm();
    setMostrarForm(false);
    loadData();
  }

  async function toggleActivo(cuenta: CuentaBancaria) {
    const nuevo = !cuenta.activo;
    const accion = nuevo ? "reactivar" : "desactivar";
    if (!confirm(`¿${accion} la cuenta ${cuenta.alias}?`)) return;
    const { error } = await supabase
      .from("cuentas_bancarias")
      .update({ activo: nuevo })
      .eq("id", cuenta.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    loadData();
  }

  const cuentasVisibles = showInactivas ? cuentas : cuentas.filter(c => c.activo);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Landmark className="w-8 h-8 text-green-700" />
        <h1 className="text-2xl font-black text-gray-900">Cuentas Bancarias</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Gestión de cuentas donde emitís cheques · {cuentas.length} cuentas totales
      </p>

      <div className="flex justify-between items-center mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactivas}
            onChange={(e) => setShowInactivas(e.target.checked)}
          />
          Mostrar inactivas
        </label>
        <button
          onClick={abrirNuevo}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 border-2 border-green-200">
          <h3 className="font-bold text-lg mb-3 text-gray-900">
            {editando ? `Editando: ${editando.alias}` : "Nueva cuenta bancaria"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Banco *</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="ITAU, FAMILIAR, BASA..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Titular *</label>
              <input
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="ANIBAL JOSE VERA / TEUS LOGISTICS"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Alias * (nombre corto)</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="ITAU AJV, FAMILIAR TEUS..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="GS">Guaraníes (GS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de cuenta</label>
              <select
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="Cuenta Corriente">Cuenta Corriente</option>
                <option value="Caja de Ahorro">Caja de Ahorro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">N° de cuenta (opcional)</label>
              <input
                type="text"
                value={nroCuenta}
                onChange={(e) => setNroCuenta(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="1234567-8"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Chequera actual (opcional)</label>
              <input
                type="text"
                value={chequeraActual}
                onChange={(e) => setChequeraActual(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="Ej: 15366970-15366999"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Oficial (opcional)</label>
              <input
                type="text"
                value={oficial}
                onChange={(e) => setOficial(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="Nombre del contacto"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={guardar}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              {editando ? "Guardar cambios" : "Crear cuenta"}
            </button>
            <button
              onClick={() => { resetForm(); setMostrarForm(false); }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Alias</th>
                <th className="text-left p-3">Banco</th>
                <th className="text-left p-3">Titular</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Moneda</th>
                <th className="text-left p-3">N° Cuenta</th>
                <th className="text-left p-3">Chequera</th>
                <th className="text-left p-3">Oficial</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentasVisibles.map((c) => (
                <tr key={c.id} className={`border-t hover:bg-gray-50 ${!c.activo ? "opacity-60" : ""}`}>
                  <td className="p-3 font-bold">{c.alias}</td>
                  <td className="p-3">{c.banco}</td>
                  <td className="p-3 text-xs">{c.titular}</td>
                  <td className="p-3 text-xs">{c.tipo_cuenta}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.moneda === "GS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                      {c.moneda}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-600">{c.nro_cuenta || "—"}</td>
                  <td className="p-3 text-xs text-gray-600">{c.chequera_actual || "—"}</td>
                  <td className="p-3 text-xs text-gray-600">{c.oficial || "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                      {c.activo ? "ACTIVA" : "INACTIVA"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => toggleActivo(c)}
                        className={c.activo ? "text-orange-600 hover:text-orange-800" : "text-green-600 hover:text-green-800"}
                        title={c.activo ? "Desactivar" : "Reactivar"}
                      >
                        {c.activo ? <ToggleRight className="w-4 h-4 inline" /> : <ToggleLeft className="w-4 h-4 inline" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cuentasVisibles.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    Sin cuentas para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
