import './BackPage.css'
import CitySvg from '../assets/city.svg'
import StarSvg from '../assets/star.svg'

function BackPage() {
  return (
    <div className="background">

      {/* 星星 */}
      <div className="top-stars-container">
        {[...Array(10)].map((_, i) => (
          <img
            key={i}
            src={StarSvg}
            alt="Star"
            className="top-star"
          />
        ))}
      </div>

      {/* 星空：小白点模拟 */}
      <div className="stars-container">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* 大星星 */}
      <div className="big-star-container">
        <img src={StarSvg} alt="Star" className="big-star" />
      </div>

      {/* 页面主内容（居中） */}
      <div className="content">
        <div className="text-container">
          <h1 className="title">匿名</h1>
          <p className="subtitle">在夜色中书写，只为被听见</p>
        </div>
      </div>

      {/* 城市 */}
      <div className="city-container">
        <img src={CitySvg} alt="City" className="city-bottom" />
      </div>

    </div>
  );
}

export default BackPage;