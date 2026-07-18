export default function ContactoPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <h2>Contacto</h2>
        <p className="muted">Escríbenos o agenda en línea en un minuto.</p>
        <div className="card">
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-control" placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label className="form-label">Correo o celular</label>
              <input className="form-control" placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-control" placeholder="¿En qué te ayudamos?" />
            </div>
            <p className="form-hint">
              Envío real de correo se conecta en F7 (Resend + cola). Por ahora es UI.
            </p>
            <button type="button" className="btn btn-primary" disabled>
              Enviar (próximamente)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
