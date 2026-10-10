package edu.uao.aves;

import java.util.List;
import java.util.Optional;

/** Contrato inicial, sin implementación de base de datos ni selección de proveedor. */
public interface SpeciesRepository {
    /** TODO: DATABASE — definir paginación, ordenamiento y filtros acordados con UAO. */
    List<SpeciesRecord> search(String query, String family, int page, int pageSize);

    Optional<SpeciesRecord> findById(String id);

    /** DTO de contrato provisional; validar campos y vocabulario taxonómico con el equipo del proyecto. */
    record SpeciesRecord(
        String id,
        String commonName,
        String scientificName,
        String englishName,
        String family,
        String order,
        String description,
        List<String> traits,
        String imageUrl,
        String audioUrl
    ) { }

    // TODO: DATABASE — implementar una clase JDBC/JPA/Spring Data cuando UAO facilite el motor,
    // credenciales, esquema, ambiente de desarrollo, reglas de autoría e identificación de registros.
}
