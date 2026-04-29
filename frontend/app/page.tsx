'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      stars: '★★★★★',
      text: 'O Copiloto encontrou uma jurisprudência do TST que eu levaria 2h para achar. Em 40 segundos estava na minha tela com a ementa formatada. Isso mudou minha rotina completamente.',
      name: 'Dr. Carlos Mendes',
      role: 'Advogado Trabalhista · São Paulo',
      initials: 'CM',
    },
    {
      stars: '★★★★★',
      text: 'Finalmente consigo entregar peças com mais qualidade e em menos tempo. O Wladmir me ensinou a usar IA de forma que respeita nossa ética profissional. Recomendo a qualquer advogado.',
      name: 'Dra. Fernanda Lima',
      role: 'Advogada Cível · Rio de Janeiro',
      initials: 'FL',
    },
    {
      stars: '★★★★★',
      text: 'Achei que seria complicado para quem não entende de tecnologia, mas é surpreendentemente simples. Já no primeiro dia consegui usar em casos reais. O suporte é excelente.',
      name: 'Dr. Roberto Andrade',
      role: 'Advogado Previdenciário · Curitiba',
      initials: 'RA',
    },
    {
      stars: '★★★★★',
      text: 'Uso todos os dias para análise de contratos. O que levava 3 horas agora leva 20 minutos. Consigo atender mais clientes sem abrir mão da qualidade.',
      name: 'Dra. Mariana Costa',
      role: 'Advogada Empresarial · Belo Horizonte',
      initials: 'MC',
    },
    {
      stars: '★★★★★',
      text: 'O módulo de acompanhamento de prazos salvou minha vida. Recebi o alerta no WhatsApp de um prazo que eu tinha esquecido de cadastrar. Isso não tem preço.',
      name: 'Dr. Paulo Ferreira',
      role: 'Advogado Família · Porto Alegre',
      initials: 'PF',
    },
  ];

  const totalSlides = testimonials.length;

  const moveCarousel = (dir: number) => {
    setCurrentSlide(prev => (prev + dir + totalSlides) % totalSlides);
  };

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  }, [currentSlide]);

  useEffect(() => {
    const interval = setInterval(() => moveCarousel(1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressBar = document.getElementById('scrollProgress');
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (progressBar) {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.width = ((scrollTop / docHeight) * 100) + '%';
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const stickyBar = document.getElementById('stickyBar');
    const heroSection = document.querySelector('.hero');
    if (stickyBar && heroSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) stickyBar.classList.add('visible');
          else stickyBar.classList.remove('visible');
        });
      }, { threshold: 0 });
      observer.observe(heroSection);
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const timeline = document.getElementById('curriculum-timeline');
    if (timeline) {
      const lineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            timeline.classList.add('timeline-active');
            lineObserver.disconnect();
          }
        });
      }, { threshold: 0.05 });
      lineObserver.observe(timeline);

      const items = timeline.querySelectorAll('.timeline-item');
      const itemObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('active');
          else entry.target.classList.remove('active');
        });
      }, { threshold: 0.4, rootMargin: '0px 0px -80px 0px' });
      items.forEach(item => itemObserver.observe(item));
      return () => { lineObserver.disconnect(); itemObserver.disconnect(); };
    }
  }, []);

  useEffect(() => {
    const questions = document.querySelectorAll('.faq-question');
    const handlers: Array<() => void> = [];
    questions.forEach(q => {
      const handler = () => {
        const item = q.parentElement;
        document.querySelectorAll('.faq-item.open').forEach(open => {
          if (open !== item) open.classList.remove('open');
        });
        item?.classList.toggle('open');
      };
      q.addEventListener('click', handler);
      handlers.push(handler);
    });
    return () => questions.forEach((q, i) => q.removeEventListener('click', handlers[i]));
  }, []);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const colors = ['rgba(124, 58, 237, 0.2)', 'rgba(144,192,224,0.2)', 'rgba(48,96,144,0.2)', 'rgba(112,144,192,0.2)'];
    const count = window.innerWidth < 768 ? 10 : 20;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      const size = Math.random() * 6 + 3;
      el.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${Math.random() * 20 + 20}s;animation-delay:-${Math.random() * 20}s;`;
      container.appendChild(el);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  const CTA_LINK = 'https://pay.hub.la/ijD5AVMkIfbwTT6gwB01';
  const handleCTA = () => window.location.href = CTA_LINK;

  const faqItems = [
    { q: 'Esse produto é para mim?', a: 'É para você se é advogado e passa horas pesquisando jurisprudência, redigindo peças repetitivas ou controlando prazos manualmente. Se quer mais tempo para estratégia e menos para operacional, o Copiloto Jurídico é exatamente o que você precisa.' },
    { q: 'Preciso saber programar?', a: 'Não. O Copiloto Jurídico foi desenvolvido para advogados sem nenhum conhecimento técnico. Se você sabe usar WhatsApp, você sabe usar o Copiloto.' },
    { q: 'O Copiloto respeita o Código de Ética da OAB?', a: 'Sim. O Copiloto é uma ferramenta de apoio — ele nunca dá aconselhamento jurídico direto a clientes nem age de forma autônoma. Toda peça gerada passa pela sua revisão antes de ser enviada. Você é sempre o responsável técnico.' },
    { q: 'O que eu preciso para começar?', a: 'Um computador e um smartphone com WhatsApp. A configuração inicial leva menos de 30 minutos seguindo o checklist passo a passo.' },
    { q: 'A jurisprudência é atualizada?', a: 'Sim. O Copiloto busca dados em tempo real do TST, TRTs e STJ via integração com as bases públicas dos tribunais. Você sempre tem acesso à jurisprudência mais recente.' },
    { q: 'Qual a diferença para o ChatGPT ou Claude?', a: 'O Copiloto é especializado em Direito Brasileiro e integrado com as bases de dados dos tribunais. O ChatGPT e o Claude são generalistas — não têm acesso a jurisprudência atualizada nem conhecem as peculiaridades do nosso ordenamento jurídico.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim. Não há fidelidade. Você pode cancelar a qualquer momento, sem burocracia, pelo próprio painel ou por WhatsApp.' },
    { q: 'E se eu não gostar?', a: 'Você tem 15 dias de garantia incondicional. Se por qualquer motivo sentir que o produto não é para você, devolvemos 100% do valor. Sem perguntas, sem burocracia.' },
  ];

  return (
    <>
      {/* SCROLL PROGRESS */}
      <div className="scroll-progress" id="scrollProgress" />

      {/* STICKY OFFER BAR */}
      <div className="sticky-bar" id="stickyBar">
        <div className="sticky-bar-inner">
          <div className="sticky-bar-info">
            <span className="sticky-label">Oferta de lançamento</span>
            <span className="sticky-divider" />
            <span className="sticky-desktop">
              <span className="sticky-price-old">R$97/mês</span>
              <span className="sticky-price-arrow"> → </span>
              <span className="sticky-price-new">R$27/mês</span>
            </span>
            <span className="sticky-mobile">
              <strong>Oferta de lançamento</strong><br />
              <span className="sticky-price-old">R$97/mês</span>
              <span className="sticky-price-arrow"> → </span>
              <span className="sticky-price-new">R$27/mês</span>
            </span>
          </div>
          <button className="sticky-bar-cta" onClick={handleCTA}>Quero meu Copiloto Jurídico →</button>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-inner">
          <a href="#" className="logo">
            <span className="logo-text">Copiloto Jurídico</span>
            <span className="logo-badge">Beta</span>
          </a>
          <button className="nav-cta" onClick={handleCTA}>Começar por R$27 →</button>
        </div>
      </nav>

      {/* ========== 1. HERO ========== */}
      <section className="hero">
        <div className="hero-particles" ref={particlesRef} id="heroParticles" />
        <div className="hero-inner">
          <h1>
            Tenha um <span className="highlight">Copiloto Jurídico de IA trabalhando por você 24/7</span>
          </h1>
          <div className="hero-sub">
            <p>Aprenda como advogados estão usando IA para:</p>
            <ul className="hero-checks">
              <li>Pesquisar jurisprudência do TST em segundos</li>
              <li>Redigir peças e pareceres com mais velocidade</li>
              <li>Acompanhar e controlar prazos processuais</li>
            </ul>
            <p>Operação jurídica otimizada.<br />Você só precisa copiar e aplicar.</p>
          </div>
          <div className="hero-cta-group">
            <button className="btn-primary" onClick={handleCTA}>Quero meu Copiloto Jurídico →</button>
            <span className="btn-sub">Primeiro mês por R$27 · Cancele quando quiser</span>
          </div>
        </div>


      </section>

      {/* ========== 2. A MUDANÇA ========== */}
      <section style={{ background: 'var(--dark2)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">A advocacia mudou</span>
          <h2 className="section-title reveal reveal-delay-1">A IA já consegue fazer boa parte do que você faz sentado na frente de um computador.</h2>
          <div className="narrative-content">
            <p className="reveal reveal-delay-2">Pesquisa de jurisprudência, análise de contratos, redação de peças iniciais, resumo de processos — <strong>tudo isso uma IA já faz. Com precisão. Rodando 24/7.</strong></p>
            <p className="reveal reveal-delay-3"><strong>O seu tempo não pode mais ser gasto em trabalho operacional que a IA faz melhor e mais rápido.</strong></p>
            <p className="reveal reveal-delay-3"><em>Isso é trabalho de Copiloto Jurídico.</em></p>
            <p className="reveal reveal-delay-4">Seu foco deve estar em estratégia, audiências, relacionamento com clientes e liderança de casos. O resto? Delega para a IA.</p>
            <p className="reveal reveal-delay-5"><strong>Quem não entender isso vai continuar soterrado em execução enquanto os escritórios ao redor ficam cada vez mais eficientes e produtivos.</strong></p>
          </div>
        </div>
      </section>

      {/* ========== 3. O PROBLEMA ========== */}
      <section style={{ background: 'var(--dark)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">O problema</span>
          <h2 className="section-title reveal reveal-delay-1">Você faz o trabalho de três advogados, mas deveria estar fazendo o de um.</h2>
          <div className="narrative-content">
            <p className="reveal reveal-delay-2"><strong>Advogado 1 — Operacional:</strong> Pesquisa jurisprudência, formata peças, monitora prazos, atualiza andamentos. Trabalho repetitivo que consome seu dia.</p>
            <p className="reveal reveal-delay-2"><strong>Advogado 2 — Tático:</strong> Analisa contratos, redige pareceres iniciais, prepara relatórios para clientes. Trabalho importante, mas que pode ser delegado.</p>
            <p className="reveal reveal-delay-2"><strong>Advogado 3 — Estratégico:</strong> Monta a estratégia do caso, conduz audiências, constrói relacionamentos, fecha negócios.</p>
            <p className="reveal reveal-delay-3"><strong>O problema?</strong></p>
            <p className="reveal reveal-delay-3">Você gasta a maior parte do tempo sendo o Advogado 1 e 2.</p>
            <p className="reveal reveal-delay-3">O Advogado 3, o único que deveria realmente ser você, <strong>é o que você menos consegue ser.</strong></p>
            <p className="reveal reveal-delay-4">Resultado: Você vive ocupado, mas <strong>nunca tem tempo para o que realmente importa.</strong></p>
            <p className="reveal reveal-delay-4">Os casos estratégicos ficam para depois. O relacionamento com clientes fica para depois.</p>
            <p className="reveal reveal-delay-5" style={{ color: 'var(--accent)', fontWeight: 700 }}>Nunca sobra tempo para você pensar.</p>
          </div>
        </div>
      </section>

      {/* ========== 4. A SOLUÇÃO ========== */}
      <section style={{ background: 'var(--dark2)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">A solução</span>
          <h2 className="section-title reveal reveal-delay-1">Copiloto Jurídico: assume o operacional e tático. Você só precisa pensar estrategicamente.</h2>
          <p className="section-subtitle reveal reveal-delay-2">O Copiloto cria agentes de IA treinados para o Direito Brasileiro. <em style={{ color: 'var(--accent)', fontStyle: 'normal', fontWeight: 600 }}>Não chatbots genéricos. Força de trabalho jurídica real.</em></p>
          <div className="solution-grid">
            <div className="solution-card reveal reveal-delay-1">
              <div className="solution-emojis"><span>⚖️</span><span>🔍</span><span>📋</span></div>
              <h3>Advogado 1 — Operacional</h3>
              <ul className="solution-list">
                <li>Pesquisa TST/TRT em segundos</li>
                <li>Monitoramento de prazos</li>
                <li>Resumo de andamentos</li>
                <li>Formatação de peças</li>
                <li>Atualização de dossiês</li>
                <li>E muito mais...</li>
              </ul>
              <span className="solution-pill solution-pill--ai">✓ Copiloto faz por você</span>
            </div>
            <div className="solution-card reveal reveal-delay-2">
              <div className="solution-emojis"><span>✍️</span><span>📊</span><span>🤝</span></div>
              <h3>Advogado 2 — Tático</h3>
              <ul className="solution-list">
                <li>Redação de peças iniciais</li>
                <li>Análise de contratos</li>
                <li>Pareceres e relatórios</li>
                <li>Resumo para clientes</li>
                <li>Pesquisa de precedentes</li>
                <li>E muito mais...</li>
              </ul>
              <span className="solution-pill solution-pill--ai">✓ Copiloto faz por você</span>
            </div>
            <div className="solution-card reveal reveal-delay-3">
              <div className="solution-emojis"><span>🧠</span><span>🎯</span><span>🏆</span></div>
              <h3>Advogado 3 — Estratégico</h3>
              <ul className="solution-list">
                <li>Montar estratégia do caso</li>
                <li>Conduzir audiências</li>
                <li>Relacionamento com clientes</li>
                <li>Fechar novos contratos</li>
                <li>Liderar a equipe</li>
              </ul>
              <span className="solution-pill solution-pill--you">Isso é com você</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 5. ANTES E DEPOIS ========== */}
      <section style={{ background: 'var(--dark)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">Antes e depois</span>
          <h2 className="section-title reveal reveal-delay-1">A diferença entre usar IA e ter um Copiloto Jurídico trabalhando por você.</h2>
          <div className="transform-cards reveal reveal-delay-2">
            <div className="transform-card transform-card--before">
              <div className="transform-card-header">Sem Copiloto Jurídico</div>
              <ul className="transform-card-list">
                <li>Horas no TRT pesquisando jurisprudência relevante</li>
                <li>Peças redigidas do zero, uma por uma</li>
                <li>Prazos controlados manualmente em planilhas</li>
                <li>Ferramentas desconectadas — não se conversam</li>
                <li>Sem tempo para pensar na estratégia do caso</li>
              </ul>
            </div>
            <div className="transform-card transform-card--after">
              <div className="transform-card-header">Com Copiloto Jurídico</div>
              <ul className="transform-card-list">
                <li>Copiloto busca e classifica jurisprudência em segundos</li>
                <li>Minutas inteligentes adaptadas ao seu estilo</li>
                <li>Controle de prazos processuais automatizado</li>
                <li>Tudo integrado num agente acessível pelo celular</li>
                <li>Você foca no estratégico — IA cuida do operacional</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 6. HISTÓRIA / PROVA ========== */}
      <section style={{ background: 'var(--dark2)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">A história</span>
          <h2 className="section-title reveal reveal-delay-1">Em 45 dias, a IA assumiu o trabalho operacional que eu e minha equipe levávamos semanas para fazer.</h2>

          <div className="story-author reveal reveal-delay-2">
            <div className="story-avatar" style={{ background: 'var(--brand)', color: 'var(--white)' }}>⚖️</div>
            <div className="story-author-info">
              <h3>Dr. Wladmir Bonadio Filho</h3>
              <p>OAB/SP 398.640 · Advogado Trabalhista desde 2013 · Especialista em Direito Civil, Trabalhista e Previdenciário</p>
            </div>
          </div>

          <div className="story-block reveal">
            <h4>O contexto:</h4>
            <p>Eu atuava em múltiplas áreas do direito simultaneamente — trabalhista, civil, consumidor, previdenciário, familiar. Cada área com sua própria jurisprudência, prazos e linguagem. Mesmo sendo estrategista, passava a maior parte do tempo no operacional.</p>
            <p style={{ marginTop: '1rem' }}>Em janeiro de 2026, decidi construir um Copiloto Jurídico do zero — treinado para o Direito Brasileiro e integrado ao meu fluxo de trabalho real.</p>
          </div>

          <div className="story-block reveal">
            <h4>O que o Copiloto faz hoje:</h4>
            <ul className="story-list">
              <li>Pesquisa jurisprudência do TST, TRT e STJ por área em tempo real</li>
              <li>Redige minutas de peças iniciais adaptadas ao caso específico</li>
              <li>Analisa contratos e aponta cláusulas problemáticas</li>
              <li>Monitora prazos e envia alertas automáticos</li>
              <li>Resume processos extensos em fichas objetivas</li>
            </ul>
            <p className="story-footnote">Tudo via uma mensagem no WhatsApp. Inclusive pelo celular, entre uma audiência e outra.</p>
          </div>

          <div className="metrics-grid">
            <div className="metric-card reveal reveal-delay-1">
              <div className="metric-value">5x</div>
              <div className="metric-label">Mais rápido na pesquisa de jurisprudência</div>
            </div>
            <div className="metric-card reveal reveal-delay-2">
              <div className="metric-value">12+</div>
              <div className="metric-label">Automações jurídicas ativas 24/7</div>
            </div>
            <div className="metric-card reveal reveal-delay-3">
              <div className="metric-value">3h</div>
              <div className="metric-label">Economizadas por dia em operacional</div>
            </div>
            <div className="metric-card reveal reveal-delay-4">
              <div className="metric-value">R$27</div>
              <div className="metric-label">/mês para ter tudo isso funcionando</div>
            </div>
          </div>

          <div className="quote-block reveal">
            <p>&ldquo;Ele não é um chatbot. É como ter um assistente jurídico extremamente competente ao meu lado, o tempo todo, fazendo as buscas e redigindo as minutas por mim enquanto eu foco no que realmente importa: a estratégia do caso.&rdquo;</p>
          </div>
        </div>
      </section>

      {/* ========== 7. USE CASES ========== */}
      <section style={{ background: 'var(--dark)' }}>
        <div className="section-inner">
          <span className="section-tag reveal">Use cases</span>
          <h2 className="section-title reveal reveal-delay-1">Como advogados de diferentes áreas estão usando o Copiloto Jurídico.</h2>
          <div className="material-grid">
            {[
              { emoji: '⚖️', title: 'Trabalhista', items: ['Pesquisa instantânea de OJ e Súmulas do TST por tema', 'Minutas de TRCT, acordos e reclamações trabalhistas', 'Análise de rescisão e cálculo de verbas'] },
              { emoji: '📋', title: 'Civil & Contratos', items: ['Revisão automática de contratos com apontamento de riscos', 'Busca de precedentes do STJ por matéria', 'Minutas de petições iniciais e contestações'] },
              { emoji: '🛡️', title: 'Consumidor', items: ['Jurisprudência de dano moral por setor (banco, plano, telco)', 'Minutas de ações contra instituições financeiras', 'Carta de notificação extrajudicial em minutos'] },
              { emoji: '👴', title: 'Previdenciário', items: ['Análise de CNIS e simulação de benefícios', 'Pesquisa de precedentes do TRF por tipo de benefício', 'Minutas de recursos administrativos ao INSS'] },
              { emoji: '👨‍👩‍👧', title: 'Família', items: ['Minutas de acordo de divórcio e guarda compartilhada', 'Jurisprudência sobre alimentos e visitação', 'Análise de partilha de bens e regimes'] },
              { emoji: '🏢', title: 'Empresarial', items: ['Análise de contratos sociais e cláusulas de saída', 'Pesquisa de responsabilidade do sócio e desconsideração', 'Minutas de distrato e reorganização societária'] },
            ].map((card, i) => (
              <div className="material-card reveal" key={i} style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
                <div className="material-emoji">{card.emoji}</div>
                <h3>{card.title}</h3>
                <ul className="usecase-list">
                  {card.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 8. DEPOIMENTOS ========== */}
      <section style={{ background: 'var(--dark2)', padding: '6rem 2rem' }}>
        <div className="section-inner">
          <span className="section-tag reveal">Depoimentos</span>
          <h2 className="section-title reveal reveal-delay-1">O que os advogados estão dizendo.</h2>
          <div className="testimonials-carousel-wrap reveal">
            <div className="testimonials-carousel-container">
              <div className="testimonials-carousel" ref={carouselRef} id="testimonialsCarousel">
                {testimonials.map((t, i) => (
                  <div className="testimonial-slide" key={i}>
                    <div className="testimonial-card">
                      <div className="testimonial-stars">{t.stars}</div>
                      <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
                      <div className="testimonial-author">
                        <div className="testimonial-avatar">{t.initials}</div>
                        <div className="testimonial-author-info">
                          <strong>{t.name}</strong>
                          <span>{t.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="carousel-btn carousel-btn--prev" onClick={() => moveCarousel(-1)} aria-label="Anterior"><ChevronLeft size={24} /></button>
            <button className="carousel-btn carousel-btn--next" onClick={() => moveCarousel(1)} aria-label="Próximo"><ChevronRight size={24} /></button>
          </div>
          <div className="carousel-dots">
            {testimonials.map((_, i) => (
              <button key={i} className={`carousel-dot${currentSlide === i ? ' active' : ''}`} onClick={() => setCurrentSlide(i)} aria-label={`Depoimento ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>


      {/* ========== 10. OFERTA ========== */}
      <section className="final-cta" id="cta-final">
        <div className="final-cta-inner">
          <h2>Seu Copiloto Jurídico está a alguns cliques de distância.</h2>
          <p className="sub">Pare de fazer o que a IA pode fazer por você. Comece agora.</p>

          <div className="offer-card">
            <div className="price-badge">Preço de lançamento</div>
            <div className="offer-price">
              <div className="pricing-original">R$97/mês</div>
              <div className="pricing-current"><span className="currency">R$</span>27</div>
              <div className="pricing-period">no primeiro mês</div>
            </div>
            <div className="stack-offer">
              <div className="stack-offer-title">O que está incluso</div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Copiloto com acesso a TST, TRT e STJ em tempo real</span></div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Gerador de minutas para as principais peças trabalhistas e cíveis</span></div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Controle de prazos processuais automatizado</span></div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Análise de contratos com apontamento de riscos</span></div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Templates prontos para 6 áreas do Direito</span></div>
              <div className="stack-offer-item"><span className="stack-offer-check">✓</span><span>Suporte via grupo exclusivo com outros advogados</span></div>
            </div>
            <div className="guarantee-badge">
              <svg className="guarantee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <div>
                <strong>Garantia incondicional de 15 dias</strong>
                <span>Se não gostar, devolvemos 100% do valor. Sem perguntas.</span>
              </div>
            </div>
          </div>

          <button id="checkout-button" className="btn-primary" onClick={handleCTA} style={{ fontSize: 'var(--text-card)', padding: '1.2rem 3rem' }}>
            Garantir minha vaga por R$27 →
          </button>
          <span className="btn-sub">Acesso imediato · Cancele quando quiser</span>
        </div>
      </section>

      {/* ========== 11. FAQ ========== */}
      <section className="faq-section">
        <div className="section-inner">
          <span className="section-tag reveal">Perguntas frequentes</span>
          <h2 className="section-title reveal reveal-delay-1">Dúvidas?</h2>
          <div className="faq-list">
            {faqItems.map((item, i) => (
              <div className="faq-item reveal" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="faq-question">
                  <span>{item.q}</span>
                  <span className="arrow">▼</span>
                </div>
                <div className="faq-answer">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 12. CTA FECHAMENTO ========== */}
      <section className="mid-cta">
        <h2>Pronto para começar?</h2>
        <p>Primeiro mês por R$27 — preço de lançamento.</p>
        <button className="btn-white" onClick={handleCTA}>Quero meu Copiloto Jurídico →</button>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>© 2026 · <a href="#" className="brand-link">Bonadio Cursos</a> · Copiloto Jurídico por Dr. Wladmir Bonadio Filho · OAB/SP 398.640</p>
      </footer>
    </>
  );
}
