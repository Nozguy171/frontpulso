"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// shadcn extras
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Calendar as CalendarIcon,
  Phone,
  XCircle,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProspectoActionsDialogProps {
  prospecto: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionCompleted?: (updated: any) => void; // opcional para refrescar lista
}

const timeOptions = [
  "08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30",
];

function formatFechaBonita(d?: Date) {
  if (!d) return "Selecciona fecha";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProspectoActionsDialog({
  prospecto,
  open,
  onOpenChange,
  onActionCompleted,
}: ProspectoActionsDialogProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // dialogs internos
  const [openCita, setOpenCita] = useState(false);
  const [openLlamada, setOpenLlamada] = useState(false);
  const [openObs, setOpenObs] = useState(false);

  // estado para formularios (usa Date en vez de string en la UI)
  const [citaFecha, setCitaFecha] = useState<Date | undefined>();
  const [citaHora, setCitaHora] = useState("");
  const [citaUbicacion, setCitaUbicacion] = useState("");
  const [citaObs, setCitaObs] = useState("");

  const [llamadaFecha, setLlamadaFecha] = useState<Date | undefined>();
  const [llamadaHora, setLlamadaHora] = useState("");
  const [llamadaObs, setLlamadaObs] = useState("");

  const [obsTexto, setObsTexto] = useState("");

  const callAction = async (accion: string, extra: any = {}) => {
    setLoadingAction(accion);
    try {
      const token = localStorage.getItem("pulso_token");

      const res = await fetch(
        `${API_BASE_URL}/prospects/${prospecto.id}/acciones`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ accion, ...extra }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        alert(data.message ?? "Error al aplicar acción");
      } else {
        onActionCompleted?.(data.prospecto);
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSinRespuesta = () => callAction("sin_respuesta");
  const handleRechazado = () => callAction("rechazado");

  // -------- Agendar cita (modal custom) ----------
  const handleSubmitCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citaFecha || !citaHora || !citaUbicacion.trim()) {
      alert("Fecha, hora y ubicación son obligatorias");
      return;
    }

    const fechaStr = toYMD(citaFecha);

    await callAction("agendar_cita", {
      fecha: fechaStr,
      hora: citaHora,
      ubicacion: citaUbicacion.trim(),
      observaciones: citaObs.trim() || undefined,
    });

    setOpenCita(false);
    setCitaObs("");
  };

  // -------- Programar llamada (modal custom) ----------
  const handleSubmitLlamada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!llamadaFecha || !llamadaHora) {
      alert("Fecha y hora son obligatorias para la llamada");
      return;
    }

    const fechaStr = toYMD(llamadaFecha);

    await callAction("programar_llamada", {
      fecha: fechaStr,
      hora: llamadaHora,
      observaciones: llamadaObs.trim() || undefined,
    });

    setOpenLlamada(false);
    setLlamadaObs("");
  };

  // -------- Añadir observaciones (modal custom) ----------
  const handleSubmitObs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsTexto.trim()) {
      alert("Las observaciones no pueden estar vacías");
      return;
    }

    await callAction("observaciones", {
      observaciones: obsTexto.trim(),
    });

    setOpenObs(false);
    setObsTexto("");
  };

  const disabled = loadingAction !== null;

  return (
    <>
      {/* Dialog principal de acciones */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{prospecto.nombre}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={handleSinRespuesta}
              disabled={disabled}
            >
              <XCircle className="h-5 w-5" />
              Sin respuesta
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={() => setOpenCita(true)}
              disabled={disabled}
            >
              <CalendarIcon className="h-5 w-5" />
              Agendar cita
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={handleRechazado}
              disabled={disabled}
            >
              <XCircle className="h-5 w-5 text-destructive" />
              Rechazado
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={() => setOpenLlamada(true)}
              disabled={disabled}
            >
              <Phone className="h-5 w-5" />
              Programar llamada
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={() => alert("Luego conectamos esta parte de amigos 😅")}
            >
              <Users className="h-5 w-5" />
              Ver amigos
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 bg-transparent"
              onClick={() => setOpenObs(true)}
              disabled={disabled}
            >
              <FileText className="h-5 w-5" />
              Añadir observaciones
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Agendar cita */}
      <Dialog open={openCita} onOpenChange={setOpenCita}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Agendar cita con {prospecto.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCita} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !citaFecha && "text-muted-foreground"
                      )}
                    >
                      <span>{formatFechaBonita(citaFecha)}</span>
                      <CalendarIcon className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={citaFecha}
                      onSelect={setCitaFecha}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <Label>Hora</Label>
                <Select
                  value={citaHora}
                  onValueChange={(value) => setCitaHora(value)}
                >
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue placeholder="Selecciona hora" />
                    <Clock className="h-4 w-4 opacity-70" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cita-ubicacion">Ubicación</Label>
              <Input
                id="cita-ubicacion"
                placeholder="Consultorio, café, domicilio, etc."
                value={citaUbicacion}
                onChange={(e) => setCitaUbicacion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cita-obs">Observaciones (opcional)</Label>
              <Textarea
                id="cita-obs"
                rows={3}
                placeholder="Notas adicionales sobre la cita"
                value={citaObs}
                onChange={(e) => setCitaObs(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCita(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled}>
                {loadingAction === "agendar_cita"
                  ? "Guardando..."
                  : "Guardar cita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Programar llamada */}
      <Dialog open={openLlamada} onOpenChange={setOpenLlamada}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Programar llamada con {prospecto.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitLlamada} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !llamadaFecha && "text-muted-foreground"
                      )}
                    >
                      <span>{formatFechaBonita(llamadaFecha)}</span>
                      <CalendarIcon className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={llamadaFecha}
                      onSelect={setLlamadaFecha}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <Label>Hora</Label>
                <Select
                  value={llamadaHora}
                  onValueChange={(value) => setLlamadaHora(value)}
                >
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue placeholder="Selecciona hora" />
                    <Clock className="h-4 w-4 opacity-70" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llamada-obs">Observaciones (opcional)</Label>
              <Textarea
                id="llamada-obs"
                rows={3}
                placeholder="Notas para recordar contexto de la llamada"
                value={llamadaObs}
                onChange={(e) => setLlamadaObs(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenLlamada(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled}>
                {loadingAction === "programar_llamada"
                  ? "Guardando..."
                  : "Guardar llamada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Añadir observaciones */}
      <Dialog open={openObs} onOpenChange={setOpenObs}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Observaciones adicionales</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitObs} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="obs-texto">Observaciones</Label>
              <Textarea
                id="obs-texto"
                rows={4}
                placeholder="Escribe notas adicionales sobre el prospecto..."
                value={obsTexto}
                onChange={(e) => setObsTexto(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenObs(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled}>
                {loadingAction === "observaciones"
                  ? "Guardando..."
                  : "Guardar observaciones"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
