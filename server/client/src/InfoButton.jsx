import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './InfoButton.css';

const InfoButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  // Obsługa kliknięcia poza modalem
  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      closeModal();
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const openModal = () => {
    setIsVisible(true);
    setIsClosing(false);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300); // tyle samo co czas animacji
  };

  const modal = (
    <div className={`info-modal-overlay ${isClosing ? 'fade-out-overlay' : ''}`}>
      <div
        className={`info-modal ${isClosing ? 'fade-out' : 'fade-in'}`}
        ref={modalRef}
      >
        <button className="info-modal-close" onClick={closeModal}>×</button>
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
        onClick={openModal}
        title="Informacje o grze"
      >
        ℹ️
      </button>

      {isVisible && ReactDOM.createPortal(modal, document.body)}
    </>
  );
};

export default InfoButton;
