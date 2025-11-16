"use client";

import type React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api";

interface ProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void; // se llamará con el prospecto creado desde el back
}

export function ProspectoDialog({
  open,
  onOpenChange,
  onSubmit,
}: ProspectoDialogProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    observaciones: "",
    recomendadoPorId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("pulso_token");

      const res = await fetch(`${API_BASE_URL}/prospects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          numero: formData.numero,
          observaciones: formData.observaciones || undefined,
          recomendado_por_id: formData.recomendadoPorId
            ? Number(formData.recomendadoPorId)
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        alert(data.message ?? "Error al crear el prospecto");
      } else {
        onSubmit(data.prospecto);
        setFormData({
          nombre: "",
          numero: "",
          observaciones: "",
          recomendadoPorId: "",
        });
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Prospecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) =>
                  setFormData({ ...formData, numero: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recomendadoPor">Recomendado por (opcional)</Label>
              {/* Por ahora es un simple input de ID; luego lo cambiamos a buscador por nombre */}
              <Input
                id="recomendadoPor"
                placeholder="ID de prospecto que lo recomendó"
                value={formData.recomendadoPorId}
                onChange={(e) =>
                  setFormData({ ...formData, recomendadoPorId: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observaciones: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
