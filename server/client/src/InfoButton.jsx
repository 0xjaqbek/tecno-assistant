import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './InfoButton.css';

const InfoButton = () => {
  const [showModal, setShowModal] = useState(false);

  const modal = (
    <div className="info-modal-overlay">
      <div className="info-modal">
        <button className="info-modal-close" onClick={() => setShowModal(false)}>×</button>
        <div className="info-modal-content">
          <h2>Projektor Snów</h2>
          <p><strong>Projektor Snów</strong> to tekstowa gra eksploracyjna, w której głównym narzędziem gracza jest rozmowa z zaawansowaną sztuczną inteligencją.</p>
          <p>To doświadczenie oparte na dialogu, ciekawości i odkrywaniu – nie dostajesz gotowych zadań, ale sam musisz szukać odpowiedzi, zadawać pytania i wyciągać wnioski.</p>
          <h3>🧩 Na czym polega rozgrywka?</h3>
          <p>Gracz prowadzi rozmowę z AI – tekstową, nieliniową i pełną niedopowiedzeń.</p>
          <p>Celem jest zrozumienie kontekstu, swojej roli i działania systemu, z którym się komunikujesz.</p>
          <p>Gra nie prowadzi za rękę – to Ty decydujesz, jak daleko chcesz się zagłębić i co chcesz odkryć.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="ambient-button"
        onClick={() => setShowModal(true)}
        title="Informacje o grze"
      >
        ℹ️
      </button>

      {showModal && ReactDOM.createPortal(modal, document.body)}
    </>
  );
};

export default InfoButton;
