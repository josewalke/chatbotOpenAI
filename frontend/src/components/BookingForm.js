import React, { useState } from 'react';

const BookingForm = ({ serviceName, onFormSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    nombre: '',
    telefono: '',
    email: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = `Confirmo mi cita con los siguientes datos:
- Fecha: ${formData.fecha}
- Hora: ${formData.hora}
- Nombre: ${formData.nombre}
- Teléfono: ${formData.telefono}
- Email: ${formData.email}`;
    
    onFormSubmit(message);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="booking-form-container">
      <div className="booking-form-header">
        <h3>📅 Reservar: {serviceName}</h3>
        <p>Completa el formulario para confirmar tu cita</p>
      </div>
      
      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-group">
          <label htmlFor="fecha">Fecha preferida *</label>
          <input
            type="date"
            id="fecha"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="hora">Hora preferida *</label>
          <select
            id="hora"
            name="hora"
            value={formData.hora}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona una hora</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="12:00">12:00</option>
            <option value="13:00">13:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
            <option value="18:00">18:00</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Nombre completo *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: María García López"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefono">Número de teléfono *</label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="Ej: 666 123 456"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Ej: maria@email.com"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            Confirmar Cita
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
