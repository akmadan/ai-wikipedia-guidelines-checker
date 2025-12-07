import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo-section">
                    <div className="logo">
                        <span className="logo-icon">📚</span>
                        <span className="logo-text">WikiAssist</span>
                    </div>
                    <span className="tagline">AI-Powered Wikipedia Contribution Assistant</span>
                </div>


            </div>
        </header>
    );
};

export default Header;
