"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { DollarSign, Plus, Trash2, Calculator, Users } from "lucide-react";
import { getProfiles } from "../../actions";
import { getEmployeePayroll, upsertPayroll, getPayrollAdjustments, addPayrollAdjustment, deletePayrollAdjustment, getAttendanceLogs } from "../actions";

interface Employee { id: string; full_name: string; full_name_ar: string | null; email: string; role: string; }
interface Payroll { base_salary: number; base_hours: number; overtime_rate: number; }
interface Adjustment { id: string; type: string; amount: number; description: string; month: string; }

export default function PayrollPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdjDialog, setShowAdjDialog] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollForm, setPayrollForm] = useState({ base_salary: 0, base_hours: 176, overtime_rate: 1.5 });
  const [adjForm, setAdjForm] = useState({ type: "bonus", amount: 0, description: "" });

  const tenantId = user?.tenant_id;

  useEffect(() => {
    if (!tenantId) return;
    getProfiles(tenantId).then(data => {
      const emps = (data || []).filter((p: { role: string }) => !["system_admin"].includes(p.role)) as unknown as Employee[];
      setEmployees(emps);
      setLoading(false);
    });
  }, [tenantId]);

  const loadEmployeePayroll = useCallback(async (empId: string) => {
    if (!tenantId) return;
    try {
      const [p, adjs, logs] = await Promise.all([
        getEmployeePayroll(empId),
        getPayrollAdjustments(empId, `${month}-01`),
        getAttendanceLogs(tenantId, {
          employee_id: empId,
          date_from: `${month}-01`,
          date_to: `${month}-31`
        }),
      ]);
      setPayroll(p as Payroll | null);
      setAdjustments((adjs || []) as Adjustment[]);
      setPayrollForm({
        base_salary: p?.base_salary || 0,
        base_hours: p?.base_hours || 176,
        overtime_rate: p?.overtime_rate || 1.5,
      });
      // Calculate total hours
      let hrs = 0;
      (logs || []).forEach((log: { check_in: string; check_out: string | null }) => {
        if (log.check_out) {
          hrs += (new Date(log.check_out).getTime() - new Date(log.check_in).getTime()) / 3600000;
        }
      });
      setTotalHours(Math.round(hrs * 100) / 100);
    } catch (err) { console.error(err); }
  }, [tenantId, month]);

  const selectEmployee = (emp: Employee) => {
    setSelectedEmp(emp);
    loadEmployeePayroll(emp.id);
  };

  const handleSavePayroll = async () => {
    if (!selectedEmp || !tenantId) return;
    setSaving(true);
    try {
      await upsertPayroll({ employee_id: selectedEmp.id, tenant_id: tenantId, ...payrollForm });
      loadEmployeePayroll(selectedEmp.id);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleAddAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !tenantId || !user) return;
    setSaving(true);
    try {
      await addPayrollAdjustment({ employee_id: selectedEmp.id, tenant_id: tenantId, type: adjForm.type, amount: adjForm.amount, description: adjForm.description, month: `${month}-01`, created_by: user.id });
      setShowAdjDialog(false);
      setAdjForm({ type: "bonus", amount: 0, description: "" });
      loadEmployeePayroll(selectedEmp.id);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDeleteAdj = async (id: string) => {
    setSaving(true);
    try { await deletePayrollAdjustment(id); if (selectedEmp) loadEmployeePayroll(selectedEmp.id); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // Calculate
  const hourlyRate = payrollForm.base_hours > 0 ? payrollForm.base_salary / payrollForm.base_hours : 0;
  const overtimeHours = Math.max(0, totalHours - payrollForm.base_hours);
  const regularPay = Math.min(totalHours, payrollForm.base_hours) * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * payrollForm.overtime_rate;
  const bonuses = adjustments.filter(a => a.type === "bonus").reduce((s, a) => s + a.amount, 0);
  const deductions = adjustments.filter(a => a.type === "deduction").reduce((s, a) => s + a.amount, 0);
  const holidayHours = adjustments.filter(a => a.type === "holiday_hours").reduce((s, a) => s + a.amount, 0);
  const holidayPay = holidayHours * hourlyRate;
  const netPay = regularPay + overtimePay + holidayPay + bonuses - deductions;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Payroll" titleAr="الرواتب" />
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Employee List */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />{isRTL ? "الموظفون" : "Employees"}</CardTitle></CardHeader>
            <CardContent className="p-2 max-h-[70vh] overflow-y-auto">
              {loading ? <div className="p-4 text-center"><div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" /></div> :
                employees.map(emp => (
                  <button key={emp.id} onClick={() => selectEmployee(emp)}
                    className={`w-full text-left rtl:text-right p-3 rounded-lg mb-1 transition-colors ${selectedEmp?.id === emp.id ? "bg-foreground text-background" : "hover:bg-accent"}`}>
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className={`text-xs ${selectedEmp?.id === emp.id ? "text-background/70" : "text-muted-foreground"}`}>{emp.email}</p>
                  </button>
                ))}
            </CardContent>
          </Card>

          {/* Payroll Detail */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedEmp ? (
              <Card><CardContent className="p-12 text-center"><DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">{isRTL ? "اختر موظفاً لعرض الراتب" : "Select an employee"}</p></CardContent></Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selectedEmp.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedEmp.email}</p>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "الشهر" : "Month"}</Label><Input type="month" value={month} onChange={e => { setMonth(e.target.value); loadEmployeePayroll(selectedEmp.id); }} className="w-44" /></div>
                </div>

                {/* Config */}
                <Card>
                  <CardHeader><CardTitle className="text-base">{isRTL ? "إعدادات الراتب" : "Salary Config"}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>{isRTL ? "الراتب الأساسي" : "Base Salary"}</Label><Input type="number" value={payrollForm.base_salary} onChange={e => setPayrollForm({...payrollForm, base_salary: parseFloat(e.target.value) || 0})} /></div>
                      <div className="space-y-2"><Label>{isRTL ? "الساعات الأساسية" : "Base Hours"}</Label><Input type="number" value={payrollForm.base_hours} onChange={e => setPayrollForm({...payrollForm, base_hours: parseFloat(e.target.value) || 0})} /></div>
                      <div className="space-y-2"><Label>{isRTL ? "معدل الأوفرتايم" : "OT Rate"}</Label><Input type="number" step="0.1" value={payrollForm.overtime_rate} onChange={e => setPayrollForm({...payrollForm, overtime_rate: parseFloat(e.target.value) || 1.5})} /></div>
                    </div>
                    <Button className="mt-4" onClick={handleSavePayroll} isLoading={saving}>{isRTL ? "حفظ الإعدادات" : "Save Config"}</Button>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-foreground text-background">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4"><Calculator className="h-5 w-5" /><h3 className="font-bold">{isRTL ? "ملخص الراتب" : "Pay Summary"}</h3></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div><p className="text-xs opacity-70">{isRTL ? "الساعات" : "Worked Hours"}</p><p className="text-xl font-bold">{totalHours}h</p></div>
                      <div><p className="text-xs opacity-70">{isRTL ? "الأوفرتايم" : "Overtime"}</p><p className="text-xl font-bold">{overtimeHours}h</p></div>
                      <div><p className="text-xs opacity-70">{isRTL ? "العطل" : "Holiday Hrs"}</p><p className="text-xl font-bold">{holidayHours}h</p></div>
                      <div><p className="text-xs opacity-70">{isRTL ? "صافي الراتب" : "Net Pay"}</p><p className="text-2xl font-bold">{netPay.toFixed(2)}</p></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-background/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div><span className="opacity-70">{isRTL ? "أساسي:" : "Regular:"}</span> {regularPay.toFixed(2)}</div>
                      <div><span className="opacity-70">{isRTL ? "أوفرتايم:" : "OT:"}</span> {overtimePay.toFixed(2)}</div>
                      <div className="text-green-300"><span className="opacity-70">{isRTL ? "مكافآت:" : "Bonuses:"}</span> +{bonuses.toFixed(2)}</div>
                      <div className="text-red-300"><span className="opacity-70">{isRTL ? "خصومات:" : "Deductions:"}</span> -{deductions.toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Adjustments */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{isRTL ? "التعديلات" : "Adjustments"}</CardTitle>
                    <Button size="sm" onClick={() => setShowAdjDialog(true)}><Plus className="h-4 w-4" />{isRTL ? "إضافة" : "Add"}</Button>
                  </CardHeader>
                  <CardContent>
                    {adjustments.length === 0 ? <p className="text-sm text-muted-foreground">{isRTL ? "لا توجد تعديلات" : "No adjustments"}</p> : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                          <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                          <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                          <TableHead></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {adjustments.map(adj => (
                            <TableRow key={adj.id}>
                              <TableCell><Badge variant={adj.type === "bonus" ? "success" : adj.type === "deduction" ? "destructive" : "info"}>{adj.type === "bonus" ? (isRTL ? "مكافأة" : "Bonus") : adj.type === "deduction" ? (isRTL ? "خصم" : "Deduction") : (isRTL ? "ساعات عطلة" : "Holiday Hrs")}</Badge></TableCell>
                              <TableCell className="font-mono">{adj.amount}</TableCell>
                              <TableCell>{adj.description}</TableCell>
                              <TableCell><Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDeleteAdj(adj.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAdjDialog} onOpenChange={setShowAdjDialog}>
        <DialogContent onClose={() => setShowAdjDialog(false)}>
          <DialogHeader><DialogTitle>{isRTL ? "إضافة تعديل" : "Add Adjustment"}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAdj} className="space-y-4">
            <div className="space-y-2"><Label>{isRTL ? "النوع" : "Type"}</Label><Select value={adjForm.type} onChange={e => setAdjForm({...adjForm, type: e.target.value})} options={[{ value: "bonus", label: isRTL ? "مكافأة" : "Bonus" }, { value: "deduction", label: isRTL ? "خصم" : "Deduction" }, { value: "holiday_hours", label: isRTL ? "ساعات عطلة" : "Holiday Hours" }]} /></div>
            <div className="space-y-2"><Label>{isRTL ? "المبلغ/الساعات" : "Amount/Hours"}</Label><Input type="number" step="0.01" value={adjForm.amount} onChange={e => setAdjForm({...adjForm, amount: parseFloat(e.target.value) || 0})} required /></div>
            <div className="space-y-2"><Label>{isRTL ? "الوصف" : "Description"}</Label><Input value={adjForm.description} onChange={e => setAdjForm({...adjForm, description: e.target.value})} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdjDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" isLoading={saving}>{isRTL ? "إضافة" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
