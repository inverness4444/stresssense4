export function AccessDenied() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
      <p className="text-sm font-semibold">У вас нет доступа к этому разделу.</p>
      <p className="mt-1 text-sm text-amber-700">Если это ошибка, свяжитесь с администратором.</p>
    </div>
  );
}
