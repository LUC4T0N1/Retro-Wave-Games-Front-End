import { useTranslation } from 'react-i18next';
import './LetterSelection.css';

function LetterSelection({ handleXSelection, xIsSelected, handleOSelection, oIsSelected }) {
  const { t } = useTranslation();
  const xActive = xIsSelected.selected === true;
  const oActive = oIsSelected.selected === true;

  return (
    <div className='letter-selection'>
      <p>{t('choose-side')}</p>
      <div className='ls-container'>
        <button
          className={xActive ? 'ls-btn ls-x ls-active' : 'ls-btn ls-x'}
          onClick={() => handleXSelection()}
        >X</button>
        <button
          className={oActive ? 'ls-btn ls-o ls-active' : 'ls-btn ls-o'}
          onClick={() => handleOSelection()}
        >O</button>
      </div>
    </div>
  );
}

export default LetterSelection;
