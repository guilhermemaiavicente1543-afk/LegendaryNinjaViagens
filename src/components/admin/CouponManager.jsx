import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

function makeCouponCode() {
  return `LN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [code, setCode] = useState(makeCouponCode());
  const [points, setPoints] = useState(10);
  const [maxUses, setMaxUses] = useState(10);
  const [message, setMessage] = useState("");

  async function loadCoupons() {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from("skill_point_coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCoupons(data || []);
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function createCoupon(event) {
    event.preventDefault();
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setMessage("Digite um código.");
      return;
    }

    const { error } = await supabase.from("skill_point_coupons").insert({
      code: normalizedCode,
      points: Number(points),
      max_uses: Number(maxUses),
      active: true,
      created_by: userData?.user?.id || null
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Cupom criado: ${normalizedCode}`);
    setCode(makeCouponCode());
    setPoints(10);
    setMaxUses(10);
    loadCoupons();
  }

  async function toggleCoupon(coupon) {
    const { error } = await supabase
      .from("skill_point_coupons")
      .update({ active: !coupon.active })
      .eq("id", coupon.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadCoupons();
  }

  return (
    <div className="coupon-manager">
      <h2>Cupons de Pontos</h2>

      <form onSubmit={createCoupon} className="coupon-form">
        <label>
          Código
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>

        <label>
          Pontos
          <input
            type="number"
            min="1"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
        </label>

        <label>
          Usos máximos
          <input
            type="number"
            min="1"
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
          />
        </label>

        <button type="submit">Criar cupom</button>
      </form>

      {message && <p className="auth-message">{message}</p>}

      <div className="coupon-list">
        {coupons.length === 0 ? (
          <p className="empty-message">Nenhum cupom criado ainda.</p>
        ) : (
          coupons.map((coupon) => (
            <article key={coupon.id} className="coupon-card">
              <div>
                <strong>{coupon.code}</strong>
                <span>
                  {coupon.points} pontos • {coupon.used_count}/{coupon.max_uses} usos
                </span>
              </div>

              <button type="button" onClick={() => toggleCoupon(coupon)}>
                {coupon.active ? "Desativar" : "Ativar"}
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
