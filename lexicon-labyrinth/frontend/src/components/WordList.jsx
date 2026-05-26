export default function WordList({ words, solvedWords }) {
  return (
    <div>
      {words.map((wordData, index) => {
        const word = wordData.word;
        const isSolved = solvedWords.includes(word.toLowerCase());
        return (
          <div
            key={index}
            className={`word-item ${isSolved ? 'solved' : ''}`}
          >
            <span className="word-text">
              {isSolved ? word.toUpperCase() : word.split('').map(() => '_').join(' ')}
            </span>
            <span className="word-status">
              {isSolved ? '已解锁' : `${word.length}字母`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
