class Favorito(Base):
    __tablename__ = "favoritos"
    __table_args__ = (
        UniqueConstraint("usuario_id", "ativo_id", name="uq_favorito_user_ativo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    ativo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ativos.id", ondelete="CASCADE"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)