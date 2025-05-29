import styles from './FrontPage.module.css'
import CitySvg from '../assets/img/city-day.png'

function FrontPage() {
    return (
        <div className={styles.background}>

            {/* 页面主内容（居中） */}
            <div className={styles.content}>
                <div className={styles.textContainer}>
                    <h1 className={styles.title}>HiThere</h1>
                    <p className={styles.subtitle}>在夜色中书写，只为被听见</p>
                </div>
            </div>

            {/* 城市 */}
            <div className={styles.cityContainer}>
                <img src={CitySvg} alt="City" className={styles.cityBottom} />
            </div>

        </div>
    );
}

export default FrontPage;