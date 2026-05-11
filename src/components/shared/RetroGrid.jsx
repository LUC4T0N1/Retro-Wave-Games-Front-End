function RetroGrid({ className = "", style }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: 'url(/background.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}

export default RetroGrid;
