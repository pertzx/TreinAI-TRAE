import Local from "../models/Local.js";

/**
 * Buscar todos os locais para administração
 */
export const getLocaisAdmin = async (req, res) => {
    try {
        const { adminId, page = 1, perPage = 10, search, estado, cidade, ativo } = req.query;

        // Verificar se é admin
        if (!adminId) {
            return res.status(400).json({
                success: false,
                msg: 'ID do administrador é obrigatório'
            });
        }

        // Construir filtros
        const filtros = {};
        
        if (search) {
            filtros.$or = [
                { localName: { $regex: search, $options: 'i' } },
                { localDescricao: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { state: { $regex: search, $options: 'i' } }
            ];
        }

        if (estado) {
            filtros.state = estado;
        }

        if (cidade) {
            filtros.city = cidade;
        }

        if (ativo !== undefined) {
            filtros.ativo = ativo === 'true' || ativo === true;
        }

        // Paginação
        const pageNum = parseInt(page) || 1;
        const limit = parseInt(perPage) || 10;
        const skip = (pageNum - 1) * limit;

        // Buscar locais
        const locais = await Local.find(filtros)
            .sort({ criadoEm: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Contar total
        const total = await Local.countDocuments(filtros);

        return res.status(200).json({
            success: true,
            msg: 'Locais encontrados',
            locais,
            total,
            page: pageNum,
            perPage: limit,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Erro em getLocaisAdmin:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erro ao buscar locais',
            error: error.message
        });
    }
};

/**
 * Atualizar status de um local
 */
export const updateLocalStatus = async (req, res) => {
    try {
        const { adminId, localId, ativo } = req.body;

        if (!adminId || !localId) {
            return res.status(400).json({
                success: false,
                msg: 'ID do administrador e ID do local são obrigatórios'
            });
        }

        const local = await Local.findOne({ 
            $or: [
                { localId },
                { _id: localId }
            ]
        });
        if (!local) {
            return res.status(404).json({
                success: false,
                msg: 'Local não encontrado'
            });
        }

        local.ativo = ativo;
        local.atualizadoEm = new Date();
        await local.save();

        return res.status(200).json({
            success: true,
            msg: 'Status do local atualizado com sucesso',
            local
        });

    } catch (error) {
        console.error('Erro em updateLocalStatus:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erro ao atualizar status do local',
            error: error.message
        });
    }
};

/**
 * Deletar um local
 */
export const deleteLocal = async (req, res) => {
    try {
        const { adminId, localId } = req.body;

        if (!adminId || !localId) {
            return res.status(400).json({
                success: false,
                msg: 'ID do administrador e ID do local são obrigatórios'
            });
        }

        const local = await Local.findOne({ 
            $or: [
                { localId },
                { _id: localId }
            ]
        });
        if (!local) {
            return res.status(404).json({
                success: false,
                msg: 'Local não encontrado'
            });
        }

        await Local.findByIdAndDelete(local._id);

        return res.status(200).json({
            success: true,
            msg: 'Local deletado com sucesso'
        });

    } catch (error) {
        console.error('Erro em deleteLocal:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erro ao deletar local',
            error: error.message
        });
    }
};

/**
 * Editar um local
 */
export const editLocal = async (req, res) => {
    try {
        const { 
            adminId, 
            localId, 
            localName, 
            localDescricao, 
            country, 
            state, 
            city, 
            lat, 
            lng,
            ativo 
        } = req.body;

        if (!adminId || !localId) {
            return res.status(400).json({
                success: false,
                msg: 'ID do administrador e ID do local são obrigatórios'
            });
        }

        const local = await Local.findOne({ 
            $or: [
                { localId },
                { _id: localId }
            ]
        });
        if (!local) {
            return res.status(404).json({
                success: false,
                msg: 'Local não encontrado'
            });
        }

        // Atualizar campos
        if (localName) local.localName = localName;
        if (localDescricao) local.localDescricao = localDescricao;
        if (country) local.country = country;
        if (state) local.state = state;
        if (city) local.city = city;
        if (lat) local.lat = lat;
        if (lng) local.lng = lng;
        if (ativo !== undefined) local.ativo = ativo;

        local.atualizadoEm = new Date();
        await local.save();

        return res.status(200).json({
            success: true,
            msg: 'Local editado com sucesso',
            local
        });

    } catch (error) {
        console.error('Erro em editLocal:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erro ao editar local',
            error: error.message
        });
    }
};